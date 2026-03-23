import os
import shutil
import tempfile

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from git import Repo
from pydantic import BaseModel, Field


load_dotenv()

app = FastAPI(title="AI UI Agent Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://shds-ai-ui-agent-workbench.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    git_url: str = Field(..., min_length=1, description="Git repository clone URL (HTTPS)")


class AnalyzeResponse(BaseModel):
    markdown: str


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

        filtered: list[str] = []
        for name in entries:
            if _is_ignored_dir(name):
                continue
            filtered.append(name)

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


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    git_url = req.git_url.strip()
    if not (git_url.startswith("https://") or git_url.startswith("http://") or git_url.startswith("git@")):
        raise HTTPException(status_code=400, detail="git_url must be a valid HTTPS/SSH git clone URL")

    temp_dir = tempfile.mkdtemp(prefix="repo_")
    repo_dir = os.path.join(temp_dir, "repo")
    try:
        repo = Repo.clone_from(git_url, repo_dir)
        commit = ""
        try:
            commit = repo.head.commit.hexsha[:8]
        except Exception:
            commit = ""

        tree = _tree_markdown(repo_dir)
        title = os.path.basename(git_url).removesuffix(".git") if hasattr(str, "removesuffix") else os.path.basename(git_url).replace(".git", "")

        md = "\n".join(
            [
                f"## Repository 분석 결과",
                "",
                f"- **URL**: `{git_url}`",
                f"- **Commit**: `{commit}`" if commit else "- **Commit**: (unknown)",
                "",
                "### File Tree",
                "",
                "```text",
                tree,
                "```",
                "",
                f"_repo name hint: **{title}**_",
            ]
        )
        return AnalyzeResponse(markdown=md)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
