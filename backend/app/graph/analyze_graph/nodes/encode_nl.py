"""
encode_nl 노드: LLM으로 각 Component/Area에 자연어 설명(description)을 추가한다.
"""
from __future__ import annotations

import json
from typing import Any, Dict

from backend.app.llm.openai_client import generate_json
from backend.app.llm.prompts import ENCODE_NL_SYSTEM_PROMPT


def _build_user_prompt(hierarchy: Dict[str, Any]) -> str:
    return (
        "다음 컴포넌트 계층 구조의 각 component와 area에 "
        "'description' 필드를 추가해서 반환해줘.\n\n"
        + json.dumps(hierarchy, ensure_ascii=False, indent=2)
    )


def _ensure_descriptions(hierarchy: Dict[str, Any]) -> Dict[str, Any]:
    """LLM 응답에 description이 빠지거나 문자열인 경우 배열로 정규화한다."""
    for comp in hierarchy.get("components", []):
        desc = comp.get("description")
        if not desc:
            comp["description"] = [f"{comp.get('name', '')} 컴포넌트입니다."]
        elif isinstance(desc, str):
            comp["description"] = [s.strip() for s in desc.split(".") if s.strip()]
        for area in comp.get("areas", []):
            adesc = area.get("description")
            if not adesc:
                area["description"] = [f"{area.get('name', '')} 영역입니다."]
            elif isinstance(adesc, str):
                area["description"] = [s.strip() for s in adesc.split(".") if s.strip()]
    return hierarchy


def encode_nl_node(state: Dict[str, Any]) -> Dict[str, Any]:
    hierarchy: Dict[str, Any] = state.get("hierarchy", {})

    if not hierarchy or not hierarchy.get("components"):
        return {"hierarchy": hierarchy}

    user_prompt = _build_user_prompt(hierarchy)

    try:
        updated = generate_json(ENCODE_NL_SYSTEM_PROMPT, user_prompt)
        updated = _ensure_descriptions(updated)
        return {"hierarchy": updated}

    except Exception as e:
        print(f"[encode_nl_node] LLM error: {e}", flush=True)
        # LLM 실패 시 기본 description 채워서 반환
        hierarchy = _ensure_descriptions(hierarchy)
        return {"hierarchy": hierarchy}
