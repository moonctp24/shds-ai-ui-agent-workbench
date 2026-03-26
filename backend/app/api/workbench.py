import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.graph.builder import build_graph

router = APIRouter()


class AnalyzeRepoRequest(BaseModel):
    repo_url: str = Field(..., min_length=1)
    branch: str = Field(default="main")


def _is_ignored_dir(name: str) -> bool:
    return name in {".git", "node_modules", ".next", "dist", "build", "__pycache__", ".venv", "venv"}


def _tree_markdown(root_dir: str, max_entries: int = 4000) -> str:
    lines: list[str] = []
    count = 0

    def walk(dir_path: str, prefix: str = "") -> None:
        nonlocal count
        if count >= max_entries:
            return

        try:
            entries = sorted(os.listdir(dir_path), key=lambda s: (not os.path.isdir(os.path.join(dir_path, s)), s.lower()))
        except OSError:
            return

        filtered: list[str] = [name for name in entries if not _is_ignored_dir(name)]
        for i, name in enumerate(filtered):
            if count >= max_entries:
                return
            full = os.path.join(dir_path, name)
            is_dir = os.path.isdir(full)
            connector = "\\-- " if i == len(filtered) - 1 else "|-- "
            lines.append(f"{prefix}{connector}{name}{'/' if is_dir else ''}")
            count += 1
            if is_dir:
                extension = "    " if i == len(filtered) - 1 else "|   "
                walk(full, prefix + extension)

    walk(root_dir, "")
    if count >= max_entries:
        lines.append("")
        lines.append(f"_… truncated (>{max_entries} entries)_")
    return "\n".join(lines)


@router.post("/analyze-repo")
def analyze_repo(payload: AnalyzeRepoRequest) -> dict:
    try:
        graph = build_graph()
        result = graph.invoke(
            {
                "repo_url": payload.repo_url,
                "branch": payload.branch,
            }
        )
        local_repo_path = result.get("local_repo_path", "")
        if local_repo_path and os.path.isdir(local_repo_path):
            tree = _tree_markdown(local_repo_path)
            markdown = "\n".join(
                [
                    "## Repository 분석 결과",
                    "",
                    f"- **URL**: `{payload.repo_url}`",
                    "",
                    "### File Tree",
                    "",
                    "```text",
                    tree,
                    "```",
                ]
            )
            result["markdown"] = markdown
            if isinstance(result.get("result"), dict):
                result["result"]["markdown"] = markdown
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))