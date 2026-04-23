"""
decode_diagram 노드: 자연어 수정 요청을 반영해 기존 Mermaid 다이어그램을 업데이트한다.

타겟 노드 탐색 우선순위:
  ① checked_area_ids 역조회 (diagram_node_map 사용) — 가장 정밀
  ② area_id(컴포넌트 ID) 역조회 — 컴포넌트 단위
  ③ 힌트 없이 LLM이 자체 판단

original_diagram이 없으면 노드를 스킵한다.
변경된 노드는 Mermaid classDef 구문으로 하이라이트를 주입한다.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from backend.app.llm.openai_client import generate_text
from backend.app.llm.prompts import DECODE_DIAGRAM_SYSTEM_PROMPT


def _get_hierarchy_chain(id_str: str) -> List[str]:
    """
    area-2-2-0-3 → ["area-2-2-0-3", "comp-2-2-0"]  (직접 ID + 직속 부모 1단계)
    comp-2-2-0   → ["comp-2-2-0",   "comp-2-2"]
    조상 전체를 올라가면 상위 노드까지 과도 매칭되므로 부모 1단계만 반환한다.
    """
    chain = [id_str]
    for prefix in ("area-", "comp-"):
        if id_str.startswith(prefix):
            parts = id_str[len(prefix):].split("-")
            if len(parts) >= 2:
                chain.append("comp-" + "-".join(parts[:-1]))
            break
    return chain


def _find_target_node_ids(
    target_hier_ids: List[str],
    diagram_node_map: Dict[str, str],
) -> List[str]:
    """
    diagram_node_map에서 값(hierarchy ID)이 target_hier_ids 중 하나(또는 그 부모 계층)와
    일치하는 키(Mermaid 노드 ID) 목록을 반환한다.
    계층 체인 매칭: area-2-2-0-3 선택 시 comp-2-2-0, comp-2-2 까지 탐색한다.
    """
    if not target_hier_ids or not diagram_node_map:
        return []
    chains = [_get_hierarchy_chain(tid) for tid in target_hier_ids]
    result = []
    for node_id, hier_id in diagram_node_map.items():
        for chain in chains:
            if hier_id in chain:
                result.append(node_id)
                break
    return result


def _build_user_prompt(
    original_diagram: str,
    modification_request: str,
    target_node_ids: List[str] | None = None,
) -> str:
    hint = ""
    if target_node_ids:
        hint = (
            f"\n\n[수정 대상 노드 힌트]\n"
            f"다음 노드 ID가 이번 수정과 직접 관련됩니다: {', '.join(target_node_ids)}\n"
            "이 노드들을 중심으로 구조 변경을 적용하세요."
        )
    return (
        f"자연어 수정 요청: {modification_request}{hint}\n\n"
        "원본 Mermaid 다이어그램:\n"
        + original_diagram
    )


def _clean_diagram(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    return raw.strip()


def _parse_nodes(diagram: str) -> Dict[str, str]:
    """Mermaid 다이어그램에서 node_id -> label 매핑을 추출한다."""
    nodes: Dict[str, str] = {}
    pattern = re.compile(r'(\w+)\s*[\[({<]+["\']?([^"\'\]\)}>]+)["\']?[\])}>]')
    for match in pattern.finditer(diagram):
        node_id, label = match.group(1).strip(), match.group(2).strip()
        if node_id.lower() not in {
            "flowchart", "graph", "classdef", "class",
            "subgraph", "end", "style", "linkstyle",
        }:
            nodes[node_id] = label
    return nodes


def _find_changed_nodes(original: str, modified: str) -> List[str]:
    """원본과 수정된 다이어그램을 비교해 변경/추가된 노드 ID 목록을 반환한다."""
    orig_nodes = _parse_nodes(original)
    mod_nodes = _parse_nodes(modified)
    changed: List[str] = []
    for node_id, label in mod_nodes.items():
        if node_id not in orig_nodes or orig_nodes[node_id] != label:
            changed.append(node_id)
    return changed


def _inject_highlights(diagram: str, changed_nodes: List[str]) -> str:
    """변경된 노드에 Mermaid classDef 하이라이트 구문을 주입한다."""
    if not changed_nodes:
        return diagram
    diagram = re.sub(r"\nclassDef modified[^\n]*", "", diagram)
    diagram = re.sub(r"\nclass [^\n]+ modified", "", diagram)
    highlight_style = (
        "classDef modified fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e"
    )
    class_assign = "class " + ",".join(changed_nodes) + " modified"
    return diagram.rstrip() + "\n" + highlight_style + "\n" + class_assign


def decode_diagram_node(state: Dict[str, Any]) -> Dict[str, Any]:
    original_diagram: str | None = state.get("original_diagram")
    modification_request: str = state.get("modification_request", "")
    area_id: str = state.get("area_id", "")
    checked_area_ids: List[str] = state.get("checked_area_ids") or []
    diagram_node_map: Dict[str, str] = state.get("diagram_node_map") or {}

    if not original_diagram or not modification_request:
        return {}

    # ── ① checked_area_ids 역조회 (가장 정밀) ────────────────────────────────
    target_node_ids: List[str] = []
    if checked_area_ids and diagram_node_map:
        target_node_ids = _find_target_node_ids(checked_area_ids, diagram_node_map)
        if target_node_ids:
            print(
                f"[decode_diagram_node] checked_area_ids 매핑 성공 "
                f"— ids={checked_area_ids}, nodes={target_node_ids}",
                flush=True,
            )

    # ── ② area_id(컴포넌트 ID) 역조회 폴백 ─────────────────────────────────
    if not target_node_ids and area_id and diagram_node_map:
        target_node_ids = _find_target_node_ids([area_id], diagram_node_map)
        if target_node_ids:
            print(
                f"[decode_diagram_node] area_id 매핑 성공 "
                f"— area_id={area_id!r}, nodes={target_node_ids}",
                flush=True,
            )

    # ── ③ 힌트 없이 LLM 자체 판단 ───────────────────────────────────────────
    if not target_node_ids:
        print(
            f"[decode_diagram_node] node_map 매핑 없음, LLM이 구조 변경 판단",
            flush=True,
        )

    user_prompt = _build_user_prompt(original_diagram, modification_request, target_node_ids)

    try:
        raw = generate_text(DECODE_DIAGRAM_SYSTEM_PROMPT, user_prompt)
        diagram = _clean_diagram(raw)
        if not diagram.startswith("flowchart"):
            raise ValueError("Invalid Mermaid diagram from LLM")

        changed_nodes = _find_changed_nodes(original_diagram, diagram)
        highlighted_diagram = _inject_highlights(diagram, changed_nodes)

        return {
            "modified_diagram": highlighted_diagram,
            "diagram_changed_nodes": changed_nodes,
        }

    except Exception as e:
        print(f"[decode_diagram_node] LLM error: {e}", flush=True)
        return {"modified_diagram": original_diagram, "diagram_changed_nodes": []}
