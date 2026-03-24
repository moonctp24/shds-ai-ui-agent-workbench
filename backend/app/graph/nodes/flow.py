def flow_node(state: dict) -> dict:
    scenario = state.get("scenario_v1", "")
    return {"flow": scenario}
