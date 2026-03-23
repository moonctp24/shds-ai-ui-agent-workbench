def diagram_node(state: dict) -> dict:
    flow = state.get("flow", "")
    return {"diagram": flow}
