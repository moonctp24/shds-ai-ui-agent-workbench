"""
LLM Provider Factory

LLM_PROVIDER 환경변수에 따라 적절한 LLM을 반환한다.
  - openai      : OpenAI API (gpt-4.1 등)
  - ollama      : Ollama 로컬 서버 (qwen2.5:7b 등)
  - huggingface : HuggingFace Transformers + CUDA 직접 추론
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod

from backend.app.core.config import settings


# ─── 추상 인터페이스 ───────────────────────────────────────────────────────────

class BaseLLMProvider(ABC):

    @abstractmethod
    def generate_text(self, system_prompt: str, user_prompt: str) -> str: ...

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        enhanced_system = (
            system_prompt
            + "\n\nIMPORTANT: Return only valid JSON. No markdown code blocks, no extra text."
        )
        raw = self.generate_text(enhanced_system, user_prompt)
        return _parse_json(raw)


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:])
        if raw.endswith("```"):
            raw = raw[: raw.rfind("```")]
    return json.loads(raw.strip())


# ─── OpenAI Provider ─────────────────────────────────────────────────────────

class OpenAIProvider(BaseLLMProvider):

    def __init__(self) -> None:
        from openai import OpenAI
        self._client = OpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_model

    def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        response = self._client.responses.create(
            model=self._model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.output_text


# ─── Ollama Provider ─────────────────────────────────────────────────────────

class OllamaProvider(BaseLLMProvider):
    """
    Ollama 로컬 서버를 통해 Qwen 등 오픈소스 모델을 사용한다.

    사전 준비:
      1. Ollama 설치: https://ollama.com/download
      2. 모델 다운로드: ollama pull qwen2.5:7b
      3. Ollama 서버 기동: ollama serve  (설치 시 자동 실행되는 경우도 있음)
    """

    def __init__(self) -> None:
        from langchain_ollama import ChatOllama
        self._llm = ChatOllama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            temperature=0.1,
        )

    def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        from langchain_core.messages import HumanMessage, SystemMessage
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        response = self._llm.invoke(messages)
        return response.content


# ─── HuggingFace Provider ────────────────────────────────────────────────────

class HuggingFaceProvider(BaseLLMProvider):
    """
    HuggingFace Transformers로 CUDA GPU에서 직접 Qwen 7B를 추론한다.

    사전 준비:
      pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
      pip install transformers accelerate bitsandbytes
    """

    def __init__(self) -> None:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
        from langchain_community.llms import HuggingFacePipeline

        model_name = settings.hf_model_name
        device = settings.hf_device

        print(f"[HuggingFaceProvider] Loading {model_name} on {device}...", flush=True)

        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            device_map=device,
            trust_remote_code=True,
        )

        pipe = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            max_new_tokens=4096,
            temperature=0.1,
            do_sample=True,
            return_full_text=False,
        )

        self._llm = HuggingFacePipeline(pipeline=pipe)
        print(f"[HuggingFaceProvider] Model loaded.", flush=True)

    def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{user_prompt}\n<|assistant|>\n"
        return self._llm.invoke(prompt)


# ─── Factory ─────────────────────────────────────────────────────────────────

_provider_instance: BaseLLMProvider | None = None


def get_provider() -> BaseLLMProvider:
    """
    싱글톤 패턴으로 LLM Provider를 반환한다.
    LLM_PROVIDER 환경변수에 따라 자동 선택된다.
    """
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider = settings.llm_provider.lower()
    print(f"[LLM Factory] Provider: {provider}", flush=True)

    if provider == "openai":
        _provider_instance = OpenAIProvider()
    elif provider == "ollama":
        _provider_instance = OllamaProvider()
    elif provider == "huggingface":
        _provider_instance = HuggingFaceProvider()
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER: '{provider}'. "
            "Choose from: openai | ollama | huggingface"
        )

    return _provider_instance


def reset_provider() -> None:
    """테스트 또는 런타임 provider 전환 시 사용."""
    global _provider_instance
    _provider_instance = None
