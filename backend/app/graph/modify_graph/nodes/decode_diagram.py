"""
decode_diagram 노드: 자연어 수정 요청을 반영해 기존 Mermaid 다이어그램을 업데이트한다.
original_diagram이 없으면 노드를 스킵한다.
변경된 노드는 Mermaid classDef 구문으로 하이라이트를 주입한다.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from backend.app.llm.openai_client import generate_text
from backend.app.llm.prompts import DECODE_DIAGRAM_SYSTEM_PROMPT


def _build_user_prompt(original_diagram: str, modification_request: str) -> str:
    return (
        f"자연어 수정 요청: {modification_request}\n\n"
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
    # comp1["헤더"], area1("로고"), node{조건} 등 다양한 Mermaid 노드 표기 지원
    pattern = re.compile(r'(\w+)\s*[\[({<]+["\']?([^"\'\]\)}>]+)["\']?[\])}>]')
    for match in pattern.finditer(diagram):
        node_id, label = match.group(1).strip(), match.group(2).strip()
        # flowchart, classDef, class 등 키워드 제외
        if node_id.lower() not in {"flowchart", "graph", "classdef", "class", "subgraph", "end", "style", "linkstyle"}:
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
    # 이미 주입된 classDef modified가 있으면 제거 후 재주입
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

    if not original_diagram or not modification_request:
        return {}

    user_prompt = _build_user_prompt(original_diagram, modification_request)

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
