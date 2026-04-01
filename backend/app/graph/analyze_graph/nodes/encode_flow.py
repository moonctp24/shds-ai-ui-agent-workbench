"""
encode_flow 노드: LLM으로 컴포넌트 계층 구조를 사용자 인터랙션 플로우 JSON으로 변환한다.
children 구조를 재귀적으로 처리한다.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

from backend.app.llm.openai_client import generate_json
from backend.app.llm.prompts import ENCODE_FLOW_SYSTEM_PROMPT
from backend.app.graph.analyze_graph.nodes.hierarchy_utils import strip_code


def _collect_all_areas(comp: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
    """컴포넌트 트리에서 모든 (컴포넌트명, 영역) 쌍을 재귀적으로 수집한다."""
    result: List[Tuple[str, Dict[str, Any]]] = []
    comp_name = comp.get("name", "")
    for area in comp.get("areas", []):
        result.append((comp_name, area))
    for child in comp.get("children", []):
        result.extend(_collect_all_areas(child))
    return result


def _fallback_flow(hierarchy: Dict[str, Any]) -> Dict[str, Any]:
    """LLM 실패 시 계층 구조에서 기본 플로우를 재귀적으로 생성한다."""
    steps = []
    step_num = 1
    for comp in hierarchy.get("components", []):
        for comp_name, area in _collect_all_areas(comp):
            steps.append({
                "step": step_num,
                "component": comp_name,
                "area": area.get("name", ""),
                "action": f"사용자가 {area.get('name', '')}에 접근한다.",
                "result": f"{area.get('name', '')} 화면이 표시된다.",
            })
            step_num += 1
    return {
        "title": f"{hierarchy.get('repository', '서비스')} 사용자 플로우",
        "steps": steps,
    }


def encode_flow_node(state: Dict[str, Any]) -> Dict[str, Any]:
    hierarchy: Dict[str, Any] = state.get("hierarchy", {})

    if not hierarchy or not hierarchy.get("components"):
        return {"flow": {"title": "플로우 없음", "steps": []}}

    user_prompt = (
        "다음 컴포넌트 계층 구조를 바탕으로 사용자 인터랙션 플로우 JSON을 생성해줘.\n\n"
        + json.dumps(strip_code(hierarchy), ensure_ascii=False, indent=2)
    )

    try:
        flow = generate_json(ENCODE_FLOW_SYSTEM_PROMPT, user_prompt)
        if not isinstance(flow, dict) or "steps" not in flow:
            raise ValueError("Invalid flow structure from LLM")
        return {"flow": flow}

    except Exception as e:
        print(f"[encode_flow_node] LLM error: {e}", flush=True)
        return {"flow": _fallback_flow(hierarchy)}
