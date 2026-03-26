from __future__ import annotations

from typing import Any


DEFAULT_NODE_FILL = "#131c2e"
DEFAULT_NODE_STROKE = "#94a3b8"
DEFAULT_TEXT = "#e5e7eb"

SELECTED_FILL = "#8B5CF6"
SELECTED_STROKE = "#8B5CF6"

MODIFIED_FILL = "#F97316"
MODIFIED_STROKE = "#F97316"


def _escape_label(text: str) -> str:
    """
    Mermaid syntax error 방지:
    - 큰따옴표를 작은따옴표로 치환
    - 줄바꿈 제거
    """
    if not text:
        return "Unnamed"
    return text.replace('"', "'").replace("\n", " ").strip()


def _normalize_title(title: str) -> str:
    """
    '2-1. 검색 영역' -> '검색 영역'
    """
    if not title:
        return "이름 없는 모듈"
    if ". " in title:
        return title.split(". ", 1)[1].strip()
    return title.strip()


def _build_steps_from_flow(flow: dict[str, Any]) -> list[dict[str, Any]]:
    steps = flow.get("steps", []) or []
    if steps:
        return steps

    return [
        {
            "step": 1,
            "node_id": "2-1",
            "title": "기본 콘텐츠 영역",
            "label": "항목 1",
            "description": "기본 콘텐츠를 표시합니다.",
            "section": "Body",
            "status": "default",
            "highlight": None,
        }
    ]


def _status_to_style(status: str) -> dict[str, str]:
    if status == "selected":
        return {
            "fill": SELECTED_FILL,
            "stroke": SELECTED_STROKE,
            "text": "#ffffff",
        }
    if status in {"modified", "selected_modified"}:
        return {
            "fill": MODIFIED_FILL,
            "stroke": MODIFIED_STROKE,
            "text": "#ffffff",
        }
    return {
        "fill": DEFAULT_NODE_FILL,
        "stroke": DEFAULT_NODE_STROKE,
        "text": DEFAULT_TEXT,
    }


def _build_mermaid(steps: list[dict[str, Any]]) -> str:
    """
    PRD 요구사항 반영:
    - Mermaid 사용
    - 모든 노드 라벨은 반드시 큰따옴표("")로 감싼다
    - 세로 플로우 기반
    """
    lines: list[str] = ["flowchart TB"]

    # 노드 선언
    for step in steps:
        node_id = step.get("node_id") or f"node_{step.get('step', 0)}"
        title = _normalize_title(step.get("title", ""))
        label = _escape_label(title)
        lines.append(f'    {node_id}["{label}"]')

    # 연결선
    for i in range(len(steps) - 1):
        current_id = steps[i].get("node_id") or f"node_{steps[i].get('step', i + 1)}"
        next_id = steps[i + 1].get("node_id") or f"node_{steps[i + 1].get('step', i + 2)}"
        lines.append(f"    {current_id} --> {next_id}")

    # 스타일
    for step in steps:
        node_id = step.get("node_id") or f"node_{step.get('step', 0)}"
        status = step.get("status", "default")
        style = _status_to_style(status)
        lines.append(
            f"    style {node_id} fill:{style['fill']},stroke:{style['stroke']},color:{style['text']},stroke-width:2px"
        )

    return "\n".join(lines)


def _build_nodes_meta(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []

    for step in steps:
        status = step.get("status", "default")
        style = _status_to_style(status)
        result.append(
            {
                "node_id": step.get("node_id"),
                "title": _normalize_title(step.get("title", "")),
                "section": step.get("section", "Body"),
                "status": status,
                "highlight": step.get("highlight"),
                "style": style,
            }
        )

    return result


def diagram_node(state: dict) -> dict:
    """
    입력:
    - state["flow"]

    출력:
    {
      "diagram": {
        "project_name": "...",
        "version": "v1.0",
        "view_type": "DIAGRAM",
        "title": "System Diagram",
        "mermaid": "...",
        "nodes": [...],
        "summary": {...}
      }
    }
    """
    flow = state.get("flow", {}) or {}
    project_name = flow.get("project_name", "auto-generated-project")
    version = flow.get("version", "v1.0")

    steps = _build_steps_from_flow(flow)
    mermaid = _build_mermaid(steps)
    nodes_meta = _build_nodes_meta(steps)

    selected_nodes = [node["node_id"] for node in nodes_meta if node["status"] in {"selected", "selected_modified"}]
    modified_nodes = [node["node_id"] for node in nodes_meta if node["status"] in {"modified", "selected_modified"}]

    diagram = {
        "project_name": project_name,
        "version": version,
        "view_type": "DIAGRAM",
        "title": "System Diagram",
        "mermaid": mermaid,
        "nodes": nodes_meta,
        "summary": {
            "total_nodes": len(nodes_meta),
            "selected_nodes": selected_nodes,
            "modified_nodes": modified_nodes,
            "direction": "TB",
        },
    }

    return {"diagram": diagram}