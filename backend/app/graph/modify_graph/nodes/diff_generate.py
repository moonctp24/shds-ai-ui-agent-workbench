"""
diff_generate 노드: original_code와 modified_code를 비교해 unified diff를 생성한다.
"""
from __future__ import annotations

import difflib
from typing import Any, Dict


def diff_generate_node(state: Dict[str, Any]) -> Dict[str, Any]:
    source_file: str = state.get("source_file", "unknown")
    original_code: str = state.get("original_code", "")
    modified_code: str = state.get("modified_code", "")

    original_lines = original_code.splitlines(keepends=True)
    modified_lines = modified_code.splitlines(keepends=True)

    diff_lines = list(
        difflib.unified_diff(
            original_lines,
            modified_lines,
            fromfile=f"a/{source_file}",
            tofile=f"b/{source_file}",
            lineterm="",
        )
    )

    diff = "\n".join(diff_lines)

    return {"diff": diff}
