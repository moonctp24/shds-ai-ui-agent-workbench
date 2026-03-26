from __future__ import annotations

from typing import Any


def _flatten_leaf_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    scenario_v1["nodes"] 구조에서 3-depth leaf만 평탄화한다.
    root -> section(Header/Body/Footer) -> leaf
    """
    leaves: list[dict[str, Any]] = []

    if not nodes:
        return leaves

    for root in nodes:
        for section in root.get("children", []) or []:
            section_title = section.get("title", "")
            section_id = section.get("id", "")
            for leaf in section.get("children", []) or []:
                leaves.append(
                    {
                        "node_id": leaf.get("id", ""),
                        "title": leaf.get("title", ""),
                        "description": leaf.get("description", ""),
                        "flow_hint": leaf.get("flow_hint", ""),
                        "section_id": section_id,
                        "section_title": section_title,
                        "source_file": leaf.get("source_file", ""),
                        "component_name": leaf.get("component_name", ""),
                    }
                )

    return leaves


def _normalize_title(title: str) -> str:
    """
    '2-1. 검색 영역' -> '검색 영역'
    """
    if not title:
        return "이름 없는 모듈"

    if ". " in title:
        return title.split(". ", 1)[1].strip()
    return title.strip()


def _section_label(section_title: str) -> str:
    if "Header" in section_title:
        return "Header"
    if "Footer" in section_title:
        return "Footer"
    return "Body"


def _build_flow_steps_from_input(flow_input: list[dict[str, Any]]) -> list[dict[str, Any]]:
    steps: list[dict[str, Any]] = []

    for index, item in enumerate(flow_input, start=1):
        title = _normalize_title(item.get("title", ""))
        flow_hint = item.get("flow_hint", "") or f"{title} 단계"
        node_id = item.get("node_id", "")

        steps.append(
            {
                "step": index,
                "node_id": node_id,
                "title": title,
                "label": f"항목 {index}",
                "description": flow_hint,
                "section": "Body",
                "status": "default",
                "highlight": None,
            }
        )

    return steps


def _build_flow_steps_from_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    leaves = _flatten_leaf_nodes(nodes)
    steps: list[dict[str, Any]] = []

    for index, leaf in enumerate(leaves, start=1):
        title = _normalize_title(leaf.get("title", ""))
        flow_hint = leaf.get("flow_hint", "") or leaf.get("description", "") or f"{title} 단계"

        steps.append(
            {
                "step": index,
                "node_id": leaf.get("node_id", ""),
                "title": title,
                "label": f"항목 {index}",
                "description": flow_hint,
                "section": _section_label(leaf.get("section_title", "")),
                "status": "default",
                "highlight": None,
                "source_file": leaf.get("source_file", ""),
                "component_name": leaf.get("component_name", ""),
            }
        )

    return steps


def _apply_state_to_steps(
    steps: list[dict[str, Any]],
    selected_node_id: str | None,
    modified_node_ids: list[str],
) -> list[dict[str, Any]]:
    modified_set = set(modified_node_ids)

    for step in steps:
        node_id = step.get("node_id", "")

        if node_id and node_id in modified_set:
            step["status"] = "modified"
            step["highlight"] = {
                "color": "#F97316",
                "reason": "modified",
            }

        if selected_node_id and node_id == selected_node_id:
            # 선택 + 수정 동시 가능
            if step["status"] == "modified":
                step["status"] = "selected_modified"
                step["highlight"] = {
                    "color": "#F97316",
                    "reason": "selected_modified",
                }
            else:
                step["status"] = "selected"
                step["highlight"] = {
                    "color": "#8B5CF6",
                    "reason": "selected",
                }

    return steps


def _ensure_minimum_steps(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    비어 있으면 프론트가 깨지지 않도록 fallback flow 제공
    """
    if steps:
        return steps

    return [
        {
            "step": 1,
            "node_id": "2-1",
            "title": "기본 콘텐츠 영역",
            "label": "항목 1",
            "description": "기본 콘텐츠를 사용자에게 표시합니다.",
            "section": "Body",
            "status": "default",
            "highlight": None,
        }
    ]


def flow_node(state: dict) -> dict:
    """
    입력 우선순위:
    1) scenario_v1["flow_input"]
    2) scenario_v1["nodes"]

    추가 상태:
    - state["selected_node_id"]
    - state["modified_node_ids"]
    """
    scenario_v1 = state.get("scenario_v1", {}) or {}
    selected_node_id = state.get("selected_node_id")
    modified_node_ids = state.get("modified_node_ids", []) or []

    flow_input = scenario_v1.get("flow_input", []) or []
    nodes = scenario_v1.get("nodes", []) or []
    version = scenario_v1.get("version", "v1.0")
    project_name = scenario_v1.get("project_name", "auto-generated-project")

    if flow_input:
        steps = _build_flow_steps_from_input(flow_input)
    else:
        steps = _build_flow_steps_from_nodes(nodes)

    steps = _ensure_minimum_steps(steps)
    steps = _apply_state_to_steps(
        steps=steps,
        selected_node_id=selected_node_id,
        modified_node_ids=modified_node_ids,
    )

    flow = {
        "project_name": project_name,
        "version": version,
        "view_type": "FLOW",
        "title": "Business Flow",
        "summary": {
            "total_steps": len(steps),
            "selected_node_id": selected_node_id,
            "modified_node_ids": modified_node_ids,
        },
        "steps": steps,
    }

    return {"flow": flow}