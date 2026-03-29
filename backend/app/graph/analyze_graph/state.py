from __future__ import annotations

from typing import Any, Dict, List, TypedDict


class AnalyzeState(TypedDict, total=False):
    # 입력
    repo_url: str
    branch: str

    # repo_load 출력
    local_repo_path: str

    # file_scan 출력
    files: List[Dict[str, Any]]

    # code_read 출력
    file_contents: Dict[str, str]   # { "src/App.vue": "<template>..." }
    project_name: str

    # analyze_code 출력 (LLM)
    hierarchy: Dict[str, Any]
    # {
    #   "repository": "my-app",
    #   "components": [
    #     {
    #       "id": "comp-1",
    #       "name": "헤더",
    #       "source_file": "src/components/Header.vue",
    #       "areas": [
    #         {
    #           "id": "area-1-1",
    #           "name": "검색 영역",
    #           "source_file": "src/components/SearchBar.vue",
    #           "component_name": "SearchBar",
    #           "code": "..."
    #         }
    #       ]
    #     }
    #   ]
    # }

    # encode_nl 출력 (LLM) — hierarchy에 description 필드 추가된 버전
    # hierarchy가 그대로 업데이트됨

    # encode_flow 출력 (LLM)
    flow: Dict[str, Any]
    # {
    #   "title": "사용자 플로우",
    #   "steps": [
    #     { "step": 1, "component": "헤더", "area": "검색 영역",
    #       "action": "...", "result": "..." }
    #   ]
    # }

    # encode_diagram 출력 (LLM) — Mermaid 다이어그램 텍스트
    diagram: str

    # 에러
    errors: List[str]
