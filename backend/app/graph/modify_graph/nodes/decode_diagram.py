"""
decode_diagram 노드: 자연어 수정 요청을 반영해 기존 Mermaid 다이어그램을 업데이트한다.
original_diagram이 없으면 노드를 스킵한다.
"""
from __future__ import annotations

import re
from typing import Any, Dict

from backend.app.llm.openai_client import generate_text
from backend.app.llm.prompts import DECODE_DIAGRAM_SYSTEM_PROMPT


def _build_user_prompt(original_diagram: str, modification_request: str) -> str:
    return (
        f"자연어 수정 요청: {modification_request}\n\n"
        "원본 Mermaid 다이어그램:\n"
        + original_diagram
    )


def _clean_diagram(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    return raw.strip()


def decode_diagram_node(state: Dict[str, Any]) -> Dict[str, Any]:
    original_diagram: str | None = state.get("original_diagram")
    modification_request: str = state.get("modification_request", "")

    if not original_diagram or not modification_request:
        return {}

    user_prompt = _build_user_prompt(original_diagram, modification_request)

    try:
        raw = generate_text(DECODE_DIAGRAM_SYSTEM_PROMPT, user_prompt)
        diagram = _clean_diagram(raw)
        if not diagram.startswith("flowchart"):
            raise ValueError("Invalid Mermaid diagram from LLM")
        return {"modified_diagram": diagram}

    except Exception as e:
        print(f"[decode_diagram_node] LLM error: {e}", flush=True)
        return {"modified_diagram": original_diagram}
