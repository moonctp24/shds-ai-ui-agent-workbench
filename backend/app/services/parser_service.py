import os


def scan_project_files(root_dir: str, max_files: int = 2000) -> list[dict]:
    results: list[dict] = []
    for base, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".next", "dist", "build", "__pycache__"}]
        for name in files:
            path = os.path.join(base, name)
            results.append({"path": os.path.relpath(path, root_dir).replace("\\", "/")})
            if len(results) >= max_files:
                return results
    return results
