"""
decode_flow 노드: 2단계로 플로우를 갱신한다.

  Phase 1 — step 탐색 우선순위:
    ① checked_area_ids (체크된 area ID 목록) — 가장 정밀한 매핑
    ② area_id (선택된 컴포넌트 ID) — 컴포넌트 단위 매핑
    ③ LLM 폴백 — 위 두 가지 모두 매핑 실패 시
  Phase 2 — 영향 step들만 LLM으로 문구 갱신, 나머지는 원본 병합
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


def _find_affected_steps_by_ids(
    original_flow: Dict[str, Any],
    target_ids: List[str],
) -> List[int]:
    """
    flow step 내 area_id 또는 component_id 가 target_ids 중 하나(또는 그 부모 계층)와
    일치하는 step 번호 목록을 반환한다.
    계층 체인 매칭: area-2-2-0-3 선택 시 comp-2-2-0, comp-2-2 까지 탐색한다.
    """
    # 각 target ID 의 계층 체인을 미리 계산
    chains = [_get_hierarchy_chain(tid) for tid in target_ids]

    matched: List[int] = []
    for step in original_flow.get("steps", []):
        if not isinstance(step, dict):
            continue
        step_area_id = step.get("area_id", "")
        step_comp_id = step.get("component_id", "")
        for chain in chains:
            if step_area_id in chain or step_comp_id in chain:
                step_num = step.get("step")
                if isinstance(step_num, int):
                    matched.append(step_num)
                break
    return sorted(set(matched))


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
    area_id: str = state.get("area_id", "")
    checked_area_ids: List[str] = state.get("checked_area_ids") or []

    if not original_flow or not modification_request:
        return {}

    valid = _valid_step_numbers(original_flow)
    if not valid:
        return {}

    affected: List[int] = []

    # ── ① checked_area_ids 우선 탐색 (가장 정밀) ────────────────────────────
    if checked_area_ids:
        affected = _find_affected_steps_by_ids(original_flow, checked_area_ids)
        if affected:
            print(
                f"[decode_flow_node] checked_area_ids 매핑 성공 "
                f"— ids={checked_area_ids}, steps={affected}",
                flush=True,
            )

    # ── ② area_id(컴포넌트 ID) 폴백 ─────────────────────────────────────────
    if not affected and area_id:
        affected = _find_affected_steps_by_ids(original_flow, [area_id])
        if affected:
            print(
                f"[decode_flow_node] area_id(컴포넌트) 매핑 성공 "
                f"— area_id={area_id!r}, steps={affected}",
                flush=True,
            )

    # ── ③ LLM Phase 1 폴백 ──────────────────────────────────────────────────
    if not affected:
        print(
            f"[decode_flow_node] ID 매핑 실패 "
            f"(checked_area_ids={checked_area_ids}, area_id={area_id!r}), LLM 폴백",
            flush=True,
        )
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

    # ── Phase 2: 해당 step만 LLM으로 문구 갱신 ──────────────────────────────
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

    # 하이라이트: 병합 후 실제로 필드가 달라진 step만
    flow_changed = _find_changed_steps(original_flow, merged)

    return {
        "modified_flow": merged,
        "flow_changed_steps": flow_changed,
    }
