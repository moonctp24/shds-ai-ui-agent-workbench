from backend.app.services.git_service import clone_repo


def repo_load_node(state: dict) -> dict:
    repo_url = state.get("repo_url")
    branch = state.get("branch", "main")
    local_path = clone_repo(repo_url, branch)
    return {"local_repo_path": local_path}
