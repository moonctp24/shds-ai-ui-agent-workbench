from __future__ import annotations

import os

from dotenv import load_dotenv

# config 모듈이 어느 진입점에서 import되더라도 .env를 읽을 수 있게 보장
# override=True: 시스템 환경변수보다 .env 파일 값 우선 적용
load_dotenv(override=True)


class Settings:
    # ── OpenAI ──────────────────────────────────────────────────────────────
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1")

    # ── Provider 선택 ────────────────────────────────────────────────────────
    # "openai" | "ollama" | "huggingface"
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")

    # ── Ollama ───────────────────────────────────────────────────────────────
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

    # ── HuggingFace ──────────────────────────────────────────────────────────
    hf_model_name: str = os.getenv("HF_MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")
    hf_device: str = os.getenv("HF_DEVICE", "cuda")

    # ── 기타 ─────────────────────────────────────────────────────────────────
    repo_cache_dir: str = os.getenv("REPO_CACHE_DIR", ".cache/repos")


settings = Settings()
