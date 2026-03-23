from typing import TypedDict, List, Dict, Any, Optional


class WorkbenchState(TypedDict, total=False):
    repo_url: str
    branch: str
    local_repo_path: str
    files: List[Dict[str, Any]]
    selected_node_id: str
    tree: Dict[str, Any]
    scenario_v1: Dict[str, Any]
    flow: Dict[str, Any]
    diagram: Dict[str, Any]
    code_guide: Dict[str, Any]
    cache_hit: bool
    errors: List[str]
