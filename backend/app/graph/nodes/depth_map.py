from backend.app.llm.openai_client import generate_text
from backend.app.llm.prompts import TREE_SYSTEM_PROMPT


def depth_map_node(state: dict) -> dict:
    files = state.get("files", [])
    user_prompt = f"repo files:\n{files}"
    raw = generate_text(TREE_SYSTEM_PROMPT, user_prompt)
    return {"tree": raw}
