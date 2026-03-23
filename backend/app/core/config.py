import os

from backend.app.core import constants


class Settings:
    openai_api_key: str | None = constants.OPENAI_API_KEY
    repo_cache_dir: str = os.getenv("REPO_CACHE_DIR", ".cache/repos")


settings = Settings()
