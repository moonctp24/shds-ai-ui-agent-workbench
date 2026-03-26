import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.graph.builder import build_graph
from backend.app.graph.nodes.scenario_v1 import _apply_description_rules, _make_description

router = APIRouter()
BUILD_ID = "scenario-desc-v2"


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


def _sample_descriptions(nodes: list[dict], limit: int = 3) -> list[dict[str, str]]:
    samples: list[dict[str, str]] = []
    for root in nodes:
        for section in root.get("children", []) or []:
            for leaf in section.get("children", []) or []:
                samples.append(
                    {
                        "id": str(leaf.get("id", "")),
                        "title": str(leaf.get("title", "")),
                        "description": str(leaf.get("description", "")),
                    }
                )
                if len(samples) >= limit:
                    return samples
    return samples


def _force_description_overwrite(nodes: list[dict]) -> None:
    for root in nodes:
        for section in root.get("children", []) or []:
            for leaf in section.get("children", []) or []:
                title = str(leaf.get("title", ""))
                label = title.split(". ", 1)[1].strip() if ". " in title else title.strip()
                evidence = leaf.get("evidence", {}) or {}
                keywords = evidence.get("keywords", []) or []
                leaf["description"] = _make_description(
                    label=label or "UI 모듈",
                    component_name=str(leaf.get("component_name", "")),
                    keywords=keywords,
                    source_file=str(leaf.get("source_file", "")),
                )


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
        result["debug"] = {"build_id": BUILD_ID}
        scenario_v1 = None
        if isinstance(result.get("scenario_v1"), dict):
            scenario_v1 = result["scenario_v1"]
        elif isinstance(result.get("result"), dict) and isinstance(result["result"].get("scenario_v1"), dict):
            scenario_v1 = result["result"]["scenario_v1"]
        if scenario_v1:
            nodes = scenario_v1.get("nodes", [])
            if isinstance(nodes, list):
                before_samples = _sample_descriptions(nodes, limit=3)
                _apply_description_rules(nodes)
                _force_description_overwrite(nodes)
                after_samples = _sample_descriptions(nodes, limit=3)
                print("### scenario_v1 description before", before_samples, flush=True)
                print("### scenario_v1 description after", after_samples, flush=True)
                result["debug"] = {
                    **result.get("debug", {}),
                    "description_before": before_samples,
                    "description_after": after_samples,
                    "scenario_module": "backend.app.graph.nodes.scenario_v1",
                }
                result["scenario_v1"] = scenario_v1
                if isinstance(result.get("result"), dict):
                    result["result"]["scenario_v1"] = scenario_v1
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