"""
기존 코드와의 호환성 유지를 위한 래퍼.
실제 LLM 호출은 model_factory의 provider에 위임한다.
"""
from __future__ import annotations

from backend.app.llm.model_factory import get_provider


def generate_text(system_prompt: str, user_prompt: str, model: str = "") -> str:
    return get_provider().generate_text(system_prompt, user_prompt)


def generate_json(system_prompt: str, user_prompt: str, model: str = "") -> dict:
    return get_provider().generate_json(system_prompt, user_prompt)
