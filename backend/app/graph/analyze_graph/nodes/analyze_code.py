"""
analyze_code 노드: LLM으로 파일 내용을 분석해 Repository → Component → Area 계층을 생성한다.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.app.llm.openai_client import generate_json
from backend.app.llm.prompts import ANALYZE_CODE_SYSTEM_PROMPT

MAX_PROMPT_CHARS = 80000


def _build_user_prompt(project_name: str, file_contents: Dict[str, str]) -> str:
    lines = [f"Project: {project_name}", "", "Source files:"]

    total = 0
    for rel_path, code in file_contents.items():
        block = f"\n--- {rel_path} ---\n{code}\n"
        if total + len(block) > MAX_PROMPT_CHARS:
            break
        lines.append(block)
        total += len(block)

    return "\n".join(lines)


def _fallback_hierarchy(project_name: str) -> Dict[str, Any]:
    return {
        "repository": project_name,
        "components": [
            {
                "id": "comp-1",
                "name": "메인 콘텐츠",
                "source_file": "",
                "description": "",
                "areas": [
                    {
                        "id": "area-1-1",
                        "name": "기본 영역",
                        "source_file": "",
                        "component_name": "Unknown",
                        "code": "",
                        "description": "",
                    }
                ],
            }
        ],
    }


def analyze_code_node(state: Dict[str, Any]) -> Dict[str, Any]:
    file_contents: Dict[str, str] = state.get("file_contents", {})
    project_name: str = state.get("project_name", "unknown")

    if not file_contents:
        return {"hierarchy": _fallback_hierarchy(project_name)}

    user_prompt = _build_user_prompt(project_name, file_contents)

    try:
        hierarchy = generate_json(ANALYZE_CODE_SYSTEM_PROMPT, user_prompt)

        # repository 필드 보정
        if "repository" not in hierarchy:
            hierarchy["repository"] = project_name
        if "components" not in hierarchy:
            hierarchy["components"] = []

        return {"hierarchy": hierarchy}

    except Exception as e:
        print(f"[analyze_code_node] LLM error: {e}", flush=True)
        return {"hierarchy": _fallback_hierarchy(project_name)}
