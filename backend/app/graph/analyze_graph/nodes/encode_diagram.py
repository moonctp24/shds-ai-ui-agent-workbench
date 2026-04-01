"""
encode_diagram 노드: LLM으로 컴포넌트 계층 구조를 Mermaid 다이어그램 텍스트로 변환한다.
children 구조를 재귀적으로 처리한다.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from backend.app.llm.openai_client import generate_text
from backend.app.llm.prompts import ENCODE_DIAGRAM_SYSTEM_PROMPT
from backend.app.graph.analyze_graph.nodes.hierarchy_utils import strip_code


def _add_component_nodes(
    lines: List[str],
    comp: Dict[str, Any],
    parent_id: Optional[str],
    counter: Dict[str, int],
) -> None:
    """컴포넌트를 재귀적으로 Mermaid 노드로 변환한다."""
    counter["n"] += 1
    comp_id = f"comp{counter['n']}"
    comp_name = comp.get("name", f"컴포넌트{counter['n']}")
    lines.append(f'  {comp_id}["{comp_name}"]')
    if parent_id:
        lines.append(f"  {parent_id} --> {comp_id}")

    for j, area in enumerate(comp.get("areas", []), start=1):
        area_id = f"{comp_id}a{j}"
        area_name = area.get("name", f"영역{j}")
        lines.append(f'  {area_id}("{area_name}")')
        lines.append(f"  {comp_id} --> {area_id}")

    for child in comp.get("children", []):
        _add_component_nodes(lines, child, comp_id, counter)


def _fallback_diagram(hierarchy: Dict[str, Any]) -> str:
    """LLM 실패 시 계층 구조에서 기본 Mermaid 다이어그램을 재귀적으로 생성한다."""
    lines = ["flowchart LR"]
    counter = {"n": 0}
    for comp in hierarchy.get("components", []):
        _add_component_nodes(lines, comp, None, counter)
    return "\n".join(lines)


def _clean_diagram(raw: str) -> str:
    """LLM 응답에서 마크다운 코드 펜스를 제거한다."""
    raw = raw.strip()
    raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    return raw.strip()


def encode_diagram_node(state: Dict[str, Any]) -> Dict[str, Any]:
    hierarchy: Dict[str, Any] = state.get("hierarchy", {})

    if not hierarchy or not hierarchy.get("components"):
        return {"diagram": 'flowchart LR\n  empty["컴포넌트 없음"]'}

    user_prompt = (
        "다음 컴포넌트 계층 구조를 바탕으로 Mermaid flowchart 다이어그램을 생성해줘.\n\n"
        + json.dumps(strip_code(hierarchy), ensure_ascii=False, indent=2)
    )

    try:
        raw = generate_text(ENCODE_DIAGRAM_SYSTEM_PROMPT, user_prompt)
        diagram = _clean_diagram(raw)
        if not diagram.startswith("flowchart"):
            raise ValueError("Invalid Mermaid diagram from LLM")
        return {"diagram": diagram}

    except Exception as e:
        print(f"[encode_diagram_node] LLM error: {e}", flush=True)
        return {"diagram": _fallback_diagram(hierarchy)}
