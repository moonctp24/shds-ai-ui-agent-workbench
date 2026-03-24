def get_cache_key(*parts: str) -> str:
    return ":".join(part for part in parts if part)
