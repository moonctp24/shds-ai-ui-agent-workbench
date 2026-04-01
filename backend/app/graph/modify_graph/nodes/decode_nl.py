"""
decode_nl 노드: 자연어 수정 요청을 받아 LLM으로 코드를 수정한다.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.app.llm.openai_client import generate_text
from backend.app.llm.prompts import DECODE_NL_SYSTEM_PROMPT


def _build_user_prompt(source_file: str, original_code: str, modification_request: str) -> str:
    return (
        f"파일: {source_file}\n\n"
        f"=== 원본 코드 ===\n{original_code}\n\n"
        f"=== 수정 요청 ===\n{modification_request}"
    )


def decode_nl_node(state: Dict[str, Any]) -> Dict[str, Any]:
    source_file: str = state.get("source_file", "")
    original_code: str = state.get("original_code", "")
    modification_request: str = state.get("modification_request", "")

    if not original_code or not modification_request:
        return {"modified_code": original_code}

    user_prompt = _build_user_prompt(source_file, original_code, modification_request)

    try:
        modified_code = generate_text(DECODE_NL_SYSTEM_PROMPT, user_prompt)

        # LLM이 마크다운 코드블록으로 감쌌을 경우 제거
        modified_code = modified_code.strip()
        if modified_code.startswith("```"):
            lines = modified_code.split("\n")
            modified_code = "\n".join(lines[1:])
            if modified_code.endswith("```"):
                modified_code = modified_code[: modified_code.rfind("```")]
            modified_code = modified_code.strip()

        return {"modified_code": modified_code}

    except Exception as e:
        print(f"[decode_nl_node] LLM error: {e}", flush=True)
        return {"modified_code": original_code, "errors": [str(e)]}
