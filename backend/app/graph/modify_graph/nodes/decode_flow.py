"""
decode_flow 노드: 자연어 수정 요청을 반영해 기존 플로우 JSON을 업데이트한다.
original_flow가 없으면 노드를 스킵한다.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List

from backend.app.llm.openai_client import generate_json
from backend.app.llm.prompts import DECODE_FLOW_SYSTEM_PROMPT


def _build_user_prompt(original_flow: Dict[str, Any], modification_request: str) -> str:
    return (
        f"자연어 수정 요청: {modification_request}\n\n"
        "원본 플로우:\n"
        + json.dumps(original_flow, ensure_ascii=False, indent=2)
    )


def _find_changed_steps(
    original_flow: Dict[str, Any], modified_flow: Dict[str, Any]
) -> List[int]:
    """원본과 수정된 플로우를 비교해 변경된 step 번호 목록을 반환한다."""
    orig_steps = {s["step"]: s for s in original_flow.get("steps", []) if "step" in s}
    changed: List[int] = []
    for step in modified_flow.get("steps", []):
        step_num = step.get("step")
        if step_num is None:
            continue
        orig = orig_steps.get(step_num)
        if orig is None:
            # 원본에 없는 새 step
            changed.append(step_num)
        elif (
            step.get("action") != orig.get("action")
            or step.get("result") != orig.get("result")
            or step.get("component") != orig.get("component")
            or step.get("area") != orig.get("area")
        ):
            changed.append(step_num)
    return changed


def decode_flow_node(state: Dict[str, Any]) -> Dict[str, Any]:
    original_flow: Dict[str, Any] | None = state.get("original_flow")
    modification_request: str = state.get("modification_request", "")

    if not original_flow or not modification_request:
        return {}

    user_prompt = _build_user_prompt(original_flow, modification_request)

    try:
        modified_flow = generate_json(DECODE_FLOW_SYSTEM_PROMPT, user_prompt)
        if not isinstance(modified_flow, dict) or "steps" not in modified_flow:
            raise ValueError("Invalid flow structure from LLM")

        changed_steps = _find_changed_steps(original_flow, modified_flow)
        return {
            "modified_flow": modified_flow,
            "flow_changed_steps": changed_steps,
        }

    except Exception as e:
        print(f"[decode_flow_node] LLM error: {e}", flush=True)
        return {"modified_flow": original_flow, "flow_changed_steps": []}
