from backend.app.services.parser_service import scan_project_files


def file_scan_node(state: dict) -> dict:
    local_path = state.get("local_repo_path")
    files = scan_project_files(local_path)
    return {"files": files}
