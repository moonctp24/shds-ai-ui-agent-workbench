"""
encode_nl 노드: LLM으로 각 Component/Area에 자연어 설명(description)을 추가한다.

LLM에는 code 필드를 제외한 경량 버전만 전송하고,
LLM 응답에서 description만 추출해 원본 hierarchy에 병합한다.
children을 재귀적으로 처리하며, code 필드가 LLM에 의해 누락되는 문제를 방지한다.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List

from backend.app.llm.openai_client import generate_json
from backend.app.llm.prompts import ENCODE_NL_SYSTEM_PROMPT
from backend.app.graph.analyze_graph.nodes.hierarchy_utils import strip_code


def _normalize_desc(desc: Any, fallback: str) -> List[str]:
    if not desc:
        return [fallback]
    if isinstance(desc, list):
        return [s for s in desc if s] or [fallback]
    if isinstance(desc, str):
        parts = [s.strip() for s in desc.split(".") if s.strip()]
        return parts or [fallback]
    return [fallback]


def _merge_component(original: Dict[str, Any], llm: Dict[str, Any]) -> None:
    """원본 컴포넌트에 LLM 응답의 description을 재귀적으로 병합한다."""
    desc = llm.get("description")
    original["description"] = _normalize_desc(desc, f"{original.get('name', '')} 컴포넌트입니다.")

    llm_area_map: Dict[str, Any] = {a.get("id", ""): a for a in llm.get("areas", [])}
    for area in original.get("areas", []):
        llm_area = llm_area_map.get(area.get("id", ""), {})
        area["description"] = _normalize_desc(
            llm_area.get("description"),
            f"{area.get('name', '')} 영역입니다.",
        )

    llm_child_map: Dict[str, Any] = {c.get("id", ""): c for c in llm.get("children", [])}
    for child in original.get("children", []):
        _merge_component(child, llm_child_map.get(child.get("id", ""), {}))


def _merge_descriptions(original: Dict[str, Any], llm_result: Dict[str, Any]) -> Dict[str, Any]:
    """LLM 응답의 description만 원본 hierarchy에 재귀적으로 병합한다."""
    llm_comp_map: Dict[str, Any] = {c.get("id", ""): c for c in llm_result.get("components", [])}
    for comp in original.get("components", []):
        _merge_component(comp, llm_comp_map.get(comp.get("id", ""), {}))
    return original


def _apply_fallback_component(comp: Dict[str, Any]) -> None:
    """LLM 실패 시 컴포넌트에 기본 description을 재귀적으로 채운다."""
    if not comp.get("description"):
        comp["description"] = [f"{comp.get('name', '')} 컴포넌트입니다."]
    for area in comp.get("areas", []):
        if not area.get("description"):
            area["description"] = [f"{area.get('name', '')} 영역입니다."]
    for child in comp.get("children", []):
        _apply_fallback_component(child)


def _apply_fallback_descriptions(hierarchy: Dict[str, Any]) -> Dict[str, Any]:
    for comp in hierarchy.get("components", []):
        _apply_fallback_component(comp)
    return hierarchy


def encode_nl_node(state: Dict[str, Any]) -> Dict[str, Any]:
    hierarchy: Dict[str, Any] = state.get("hierarchy", {})

    if not hierarchy or not hierarchy.get("components"):
        return {"hierarchy": hierarchy}

    # code 필드 없이 경량 버전을 LLM에 전송
    stripped = strip_code(hierarchy)
    user_prompt = (
        "다음 컴포넌트 계층 구조의 각 component, area, children에 "
        "'description' 필드를 추가해서 반환해줘.\n\n"
        + json.dumps(stripped, ensure_ascii=False, indent=2)
    )

    try:
        llm_result = generate_json(ENCODE_NL_SYSTEM_PROMPT, user_prompt)
        updated = _merge_descriptions(hierarchy, llm_result)
        return {"hierarchy": updated}

    except Exception as e:
        print(f"[encode_nl_node] LLM error: {e}", flush=True)
        return {"hierarchy": _apply_fallback_descriptions(hierarchy)}
