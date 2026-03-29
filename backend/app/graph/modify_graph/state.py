from __future__ import annotations

from typing import List, TypedDict


class ModifyState(TypedDict, total=False):
    # 입력 (클라이언트에서 제공)
    area_id: str
    source_file: str
    original_code: str
    modification_request: str   # 자연어 수정 요청 (한국어)

    # decode_nl 출력 (LLM)
    modified_code: str

    # diff_generate 출력
    diff: str                   # unified diff 문자열

    # 에러
    errors: List[str]
