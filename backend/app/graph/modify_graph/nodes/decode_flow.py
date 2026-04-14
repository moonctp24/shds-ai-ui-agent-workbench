"""
decode_flow 노드: 2단계로 플로우를 갱신한다.
  Phase 1 — LLM이 수정 요청에 따라 영향받는 step 번호만 분류
  Phase 2 — 해당 step들만 문구를 갱신한 뒤, 나머지는 원본과 병합

이렇게 하면 전체 플로우를 한 번에 재생성할 때 생기는
‘문장만 살짝 바뀐 step이 전부 하이라이트’ 문제를 줄인다.
"""
from __future__ import annotations

import copy
import json
from typing import Any, Dict, List

from backend.app.llm.openai_client import generate_json
from backend.app.llm.prompts import (
    DECODE_FLOW_PARTIAL_SYSTEM_PROMPT,
    FLOW_AFFECTED_STEPS_SYSTEM_PROMPT,
)


def _find_changed_steps(
    original_flow: Dict[str, Any], modified_flow: Dict[str, Any]
) -> List[int]:
    """원본과 수정된 플로우를 비교해 필드가 달라진 step 번호 목록을 반환한다."""
    orig_steps = {s["step"]: s for s in original_flow.get("steps", []) if "step" in s}
    changed: List[int] = []
    for step in modified_flow.get("steps", []):
        step_num = step.get("step")
        if step_num is None:
            continue
        orig = orig_steps.get(step_num)
        if orig is None:
            changed.append(step_num)
        elif (
            step.get("action") != orig.get("action")
            or step.get("result") != orig.get("result")
            or step.get("component") != orig.get("component")
            or step.get("area") != orig.get("area")
        ):
            changed.append(step_num)
    return sorted(changed)


def _valid_step_numbers(flow: Dict[str, Any]) -> set[int]:
    return {s["step"] for s in flow.get("steps", []) if "step" in s}


def _build_phase1_user_prompt(
    original_flow: Dict[str, Any], modification_request: str
) -> str:
    return (
        f"수정 요청:\n{modification_request}\n\n"
        "전체 플로우 JSON:\n"
        + json.dumps(original_flow, ensure_ascii=False, indent=2)
    )


def _build_phase2_user_prompt(
    subset_steps: List[Dict[str, Any]], modification_request: str
) -> str:
    return (
        f"수정 요청:\n{modification_request}\n\n"
        "아래 step들만 내용을 갱신하세요. step 번호는 반드시 동일하게 유지합니다.\n"
        + json.dumps(subset_steps, ensure_ascii=False, indent=2)
    )


def _merge_partial_into_flow(
    original_flow: Dict[str, Any], partial_steps: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """원본 플로우 복사본에 partial_steps의 해당 step만 덮어쓴다."""
    out = copy.deepcopy(original_flow)
    by_num = {s["step"]: i for i, s in enumerate(out.get("steps", [])) if "step" in s}
    for ps in partial_steps:
        n = ps.get("step")
        if n is not None and n in by_num:
            out["steps"][by_num[n]] = ps
    return out


def decode_flow_node(state: Dict[str, Any]) -> Dict[str, Any]:
    original_flow: Dict[str, Any] | None = state.get("original_flow")
    modification_request: str = state.get("modification_request", "")

    if not original_flow or not modification_request:
        return {}

    valid = _valid_step_numbers(original_flow)
    if not valid:
        return {}

    # ── Phase 1: 영향 step 번호만 분류 ─────────────────────────────────────
    try:
        phase1 = generate_json(
            FLOW_AFFECTED_STEPS_SYSTEM_PROMPT,
            _build_phase1_user_prompt(original_flow, modification_request),
        )
    except Exception as e:
        print(f"[decode_flow_node] Phase1 LLM error: {e}", flush=True)
        return {"modified_flow": original_flow, "flow_changed_steps": []}

    raw_affected = phase1.get("affected_steps") or phase1.get("affected_step_numbers")
    if not isinstance(raw_affected, list):
        raw_affected = []

    affected: List[int] = []
    for x in raw_affected:
        if isinstance(x, int) and x in valid:
            affected.append(x)
        elif isinstance(x, str) and x.isdigit():
            n = int(x)
            if n in valid:
                affected.append(n)

    affected = sorted(set(affected))

    if not affected:
        return {
            "modified_flow": copy.deepcopy(original_flow),
            "flow_changed_steps": [],
        }

    # 영향 step의 원본 객체만 Phase 2에 전달
    step_by_num = {
        s["step"]: s
        for s in original_flow.get("steps", [])
        if isinstance(s, dict) and "step" in s
    }
    subset = [copy.deepcopy(step_by_num[n]) for n in affected if n in step_by_num]

    # ── Phase 2: 해당 step만 문구 갱신 ─────────────────────────────────────
    try:
        phase2 = generate_json(
            DECODE_FLOW_PARTIAL_SYSTEM_PROMPT,
            _build_phase2_user_prompt(subset, modification_request),
        )
    except Exception as e:
        print(f"[decode_flow_node] Phase2 LLM error: {e}", flush=True)
        return {"modified_flow": original_flow, "flow_changed_steps": []}

    partial_list = phase2.get("steps")
    if not isinstance(partial_list, list):
        partial_list = []

    merged = _merge_partial_into_flow(original_flow, partial_list)

    # 하이라이트: 병합 후 실제로 필드가 달라진 step만 (영향 목록에 있어도 문구 동일이면 제외)
    flow_changed = _find_changed_steps(original_flow, merged)

    return {
        "modified_flow": merged,
        "flow_changed_steps": flow_changed,
    }
