from __future__ import annotations

from typing import Any, Dict, List, TypedDict


class ModifyState(TypedDict, total=False):
    # 입력 (클라이언트에서 제공)
    area_id: str
    source_file: str
    original_code: str
    modification_request: str   # 자연어 수정 요청 (한국어)

    # flow/diagram 입력 (선택적 — 없으면 노드에서 스킵)
    original_flow: Dict[str, Any]
    original_diagram: str

    # decode_nl 출력 (LLM)
    modified_code: str

    # diff_generate 출력
    diff: str                   # unified diff 문자열

    # decode_flow 출력 (LLM)
    modified_flow: Dict[str, Any]

    # decode_diagram 출력 (LLM)
    modified_diagram: str

    # 에러
    errors: List[str]
