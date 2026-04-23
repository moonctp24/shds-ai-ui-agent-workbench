from __future__ import annotations

from typing import Any, Dict, List, TypedDict


class ModifyState(TypedDict, total=False):
    # 입력 (클라이언트에서 제공)
    area_id: str                        # 선택된 컴포넌트 ID (코드 수집 기준)
    checked_area_ids: List[str]         # 체크된 area ID 목록 (flow/diagram 정밀 매핑용)
    source_file: str
    original_code: str
    modification_request: str   # 자연어 수정 요청 (한국어)

    # flow/diagram 입력 (선택적 — 없으면 노드에서 스킵)
    original_flow: Dict[str, Any]
    original_diagram: str

    # Mermaid 노드 ID → hierarchy ID 매핑 (선택적 — ID 기반 탐색에 사용)
    diagram_node_map: Dict[str, str]

    # decode_nl 출력 (LLM)
    modified_code: str

    # diff_generate 출력
    diff: str                   # unified diff 문자열

    # decode_flow 출력 (LLM)
    modified_flow: Dict[str, Any]
    flow_changed_steps: List[int]       # 변경된 step 번호 목록 (1-indexed)

    # decode_diagram 출력 (LLM)
    modified_diagram: str
    diagram_changed_nodes: List[str]    # 변경된 Mermaid 노드 ID 목록

    # 에러
    errors: List[str]
