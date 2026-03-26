from typing import TypedDict, List, Dict, Any, Optional


class WorkbenchState(TypedDict, total=False):
    # request / repo
    repo_url: str
    branch: str
    local_repo_path: str

    # scanned artifacts
    files: List[Dict[str, Any]]
    tree: Dict[str, Any]

    # user interaction state
    selected_node_id: Optional[str]
    modified_node_ids: List[str]

    # generated outputs
    scenario_v1: Dict[str, Any]
    preview: Dict[str, Any]
    flow: Dict[str, Any]
    diagram: Dict[str, Any]
    code_guide: Dict[str, Any]

    # execution metadata
    cache_hit: bool
    errors: List[str]

    # final bundled response
    result: Dict[str, Any]