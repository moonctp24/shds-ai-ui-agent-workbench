"""
code_read 노드: 레포에서 Vue/React 핵심 파일을 읽어 file_contents에 저장한다.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List

MAX_CHARS_PER_FILE = 4000
MAX_TOTAL_CHARS = 80000
MAX_FILES = 30

VUE_EXTENSIONS = (".vue",)
REACT_EXTENSIONS = (".tsx", ".jsx", ".ts", ".js")
ALL_EXTENSIONS = VUE_EXTENSIONS + REACT_EXTENSIONS

SKIP_DIRS = {".git", "node_modules", ".next", "dist", "build", "__pycache__", ".venv", "venv"}


def _norm(path: str) -> str:
    return os.path.normpath(path).replace("\\", "/")


def _relpath(root: str, path: str) -> str:
    try:
        return _norm(os.path.relpath(path, root))
    except Exception:
        return _norm(path)


def _read(path: str, max_chars: int = MAX_CHARS_PER_FILE) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read(max_chars)
    except OSError:
        return ""


def _collect_entry_files(root: str) -> List[str]:
    """Vue/React 엔트리 파일을 우선순위 순으로 수집한다."""
    candidates: List[str] = []

    # Vue 엔트리
    for rel in ["src/App.vue", "App.vue", "src/main.js", "src/main.ts"]:
        full = os.path.join(root, rel)
        if os.path.isfile(full):
            candidates.append(_norm(full))

    # React 엔트리
    for rel in [
        "src/app/page.tsx", "src/app/page.jsx",
        "app/page.tsx", "app/page.jsx",
        "src/pages/index.tsx", "src/pages/index.jsx",
        "pages/index.tsx", "pages/index.jsx",
    ]:
        full = os.path.join(root, rel)
        if os.path.isfile(full):
            candidates.append(_norm(full))

    return candidates


def _collect_component_files(root: str) -> List[str]:
    """views/, pages/, components/ 하위 파일을 수집한다."""
    result: List[str] = []
    priority_dirs = [
        os.path.join(root, "src", "views"),
        os.path.join(root, "src", "pages"),
        os.path.join(root, "src", "components"),
        os.path.join(root, "views"),
        os.path.join(root, "pages"),
        os.path.join(root, "components"),
        os.path.join(root, "src", "app"),
        os.path.join(root, "app"),
    ]
    for base in priority_dirs:
        if not os.path.isdir(base):
            continue
        for cur, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for name in files:
                if name.endswith(ALL_EXTENSIONS):
                    result.append(_norm(os.path.join(cur, name)))

    return result


def code_read_node(state: Dict[str, Any]) -> Dict[str, Any]:
    root = state.get("local_repo_path", "")

    if not root or not os.path.isdir(root):
        return {"file_contents": {}, "project_name": "unknown"}

    project_name = os.path.basename(_norm(root)) or "unknown"

    # 수집 순서: 엔트리 파일 → 컴포넌트 파일
    paths: List[str] = []
    seen: set = set()

    for p in _collect_entry_files(root) + _collect_component_files(root):
        if p not in seen:
            seen.add(p)
            paths.append(p)

    file_contents: Dict[str, str] = {}
    total_chars = 0

    for path in paths:
        if len(file_contents) >= MAX_FILES:
            break
        if total_chars >= MAX_TOTAL_CHARS:
            break

        content = _read(path)
        if not content.strip():
            continue

        rel = _relpath(root, path)
        file_contents[rel] = content
        total_chars += len(content)

    return {
        "file_contents": file_contents,
        "project_name": project_name,
    }
