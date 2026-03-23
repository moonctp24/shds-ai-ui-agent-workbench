from openai import OpenAI

from backend.app.core.config import settings

_client = OpenAI(api_key=settings.openai_api_key)


def generate_text(system_prompt: str, user_prompt: str, model: str = "gpt-4.1") -> str:
    response = _client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return response.output_text
