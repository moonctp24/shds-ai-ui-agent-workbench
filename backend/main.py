from __future__ import annotations

import os
import re
import shutil
import tempfile

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from git import Repo
from pydantic import BaseModel, Field

from backend.app.api.workbench import router as workbench_router


load_dotenv()

app = FastAPI(title="AI UI Agent Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workbench_router, prefix="/api")


class AnalyzeRequest(BaseModel):
    git_url: str = Field(..., min_length=1, description="Git repository clone URL (HTTPS)")


class TreeNode(BaseModel):
    id: str
    label: str
    level: int
    children: list["TreeNode"] | None = None
    path: str | None = None
    is_dir: bool | None = None


class AnalyzeResponse(BaseModel):
    markdown: str
    tree: list[TreeNode] | None = None
    node_docs: dict[str, str] | None = None
    scenario_v1: dict | None = None


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


def _tree_json(root_dir: str, max_depth: int = 4, max_entries: int = 600) -> list[TreeNode]:
    count = 0
    root_dir = os.path.abspath(root_dir)

    def walk(dir_path: str, level: int) -> list[TreeNode]:
        nonlocal count
        if count >= max_entries or level > max_depth:
            return []

        try:
            entries = sorted(os.listdir(dir_path), key=lambda s: (not os.path.isdir(os.path.join(dir_path, s)), s.lower()))
        except OSError:
            return []

        nodes: list[TreeNode] = []
        for name in entries:
            if count >= max_entries:
                break
            if _is_ignored_dir(name):
                continue
            full = os.path.join(dir_path, name)
            is_dir = os.path.isdir(full)
            rel_path = os.path.relpath(full, root_dir).replace("\\", "/")
            node_id = rel_path
            node = TreeNode(
                id=node_id,
                label=name + ("/" if is_dir else ""),
                level=level,
                path=rel_path,
                is_dir=is_dir,
            )
            count += 1
            if is_dir:
                node.children = walk(full, level + 1) or None
            nodes.append(node)
        return nodes

    return walk(root_dir, 0)


def _read_text(path: str, max_chars: int = 8000) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as handle:
            return handle.read(max_chars)
    except OSError:
        return ""


def _describe_file(path: str, text: str) -> str:
    name = os.path.basename(path)
    ext = os.path.splitext(name)[1].lower()
    lower = text.lower()

    if ext in {".md"}:
        return "문서 파일입니다. 프로젝트 설명이나 기획 내용을 담습니다."
    if ext in {".json", ".yml", ".yaml", ".toml"}:
        return "설정/데이터 파일입니다. 빌드나 런타임 설정을 정의합니다."
    if ext in {".css", ".scss", ".sass"}:
        return "스타일 파일입니다. 화면 색상/레이아웃/타이포그래피를 정의합니다."
    if ext in {".py"}:
        if "fastapi" in lower:
            return "백엔드 API 서버 파일입니다. FastAPI 라우트와 미들웨어가 정의됩니다."
        if "pydantic" in lower:
            return "데이터 스키마/검증 로직을 정의하는 파이썬 모듈입니다."
        return "파이썬 모듈 파일입니다."
    if ext in {".ts", ".tsx", ".js", ".jsx"}:
        if "next" in lower and "page" in name.lower():
            return "페이지 컴포넌트입니다. 라우트의 화면을 렌더링합니다."
        if "layout" in name.lower():
            return "레이아웃 컴포넌트입니다. 공통 레이아웃/메타데이터를 설정합니다."
        if "api" in lower or "route" in name.lower():
            return "API 라우트/핸들러 파일입니다."
        if "export default" in lower and "return (" in lower:
            return "UI 컴포넌트 파일입니다. 화면을 렌더링하는 React 컴포넌트가 포함됩니다."
        if "use state" in lower or "usestate" in lower:
            return "클라이언트 상태를 사용하는 UI 컴포넌트 파일입니다."
        return "프론트엔드 로직/컴포넌트 파일입니다."

    return "프로젝트 리소스 파일입니다."


def _build_node_docs(root_dir: str, tree: list[TreeNode]) -> dict[str, str]:
    root_dir = os.path.abspath(root_dir)
    docs: dict[str, str] = {}

    def walk(nodes: list[TreeNode]) -> None:
        for node in nodes:
            if node.path:
                full = os.path.join(root_dir, node.path.replace("/", os.sep))
                if node.is_dir:
                    docs[node.id] = "폴더 항목입니다. 하위 파일/폴더를 포함합니다."
                else:
                    text = _read_text(full)
                    docs[node.id] = _describe_file(full, text)
            if node.children:
                walk(node.children)

    walk(tree)
    return docs


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

        tree_json = _tree_json(repo_dir)
        node_docs = _build_node_docs(repo_dir, tree_json)
        from backend.app.services.parser_service import scan_project_files
        from backend.app.graph.nodes.scenario_v1 import scenario_v1_node
        files = scan_project_files(repo_dir)
        scenario_v1 = scenario_v1_node({"files": files, "local_repo_path": repo_dir}).get("scenario_v1")
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
        return AnalyzeResponse(markdown=md, tree=tree_json, node_docs=node_docs, scenario_v1=scenario_v1)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
