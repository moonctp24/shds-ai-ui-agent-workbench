from __future__ import annotations

import os
from typing import Any


def _normalize_title(title: str) -> str:
    if not title:
        return "이름 없는 모듈"
    if ". " in title:
        return title.split(". ", 1)[1].strip()
    return title.strip()


def _flatten_leaf_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    leaves: list[dict[str, Any]] = []

    if not nodes:
        return leaves

    for root in nodes:
        for section in root.get("children", []) or []:
            section_title = section.get("title", "")
            for leaf in section.get("children", []) or []:
                leaves.append(
                    {
                        "node_id": leaf.get("id", ""),
                        "title": leaf.get("title", ""),
                        "description": leaf.get("description", ""),
                        "source_file": leaf.get("source_file", ""),
                        "component_name": leaf.get("component_name", ""),
                        "code_hint": leaf.get("code_hint", {}) or {},
                        "section_title": section_title,
                    }
                )

    return leaves


def _detect_file_type(source_file: str, recommended_target: str = "") -> str:
    if recommended_target:
        return recommended_target

    ext = os.path.splitext(source_file)[1].lower()

    if ext == ".java":
        return "JAVA"
    if ext == ".vue":
        return "VUE"
    if ext == ".sql":
        return "SQL"
    if ext in {".tsx", ".jsx", ".ts", ".js"}:
        return "REACT"
    if ext == ".py":
        return "PYTHON"

    return "SOURCE"


def _make_update_reason(title: str, section_title: str) -> str:
    section_name = "Body"
    if "Header" in section_title:
        section_name = "Header"
    elif "Footer" in section_title:
        section_name = "Footer"

    return f"{section_name} 영역의 '{title}' 모듈 반영을 위해 관련 소스 수정이 필요합니다."


def _make_update_guide(
    title: str,
    description: str,
    file_type: str,
    component_name: str,
) -> list[str]:
    guides: list[str] = []

    guides.append(f"{title} UI 요구사항을 반영하도록 {component_name or '대상 컴포넌트'} 구조를 점검합니다.")
    guides.append("선택/수정 상태에 따라 화면 표시 텍스트와 렌더링 결과가 일치하도록 조건 분기를 추가합니다.")

    if file_type == "REACT":
        guides.append("컴포넌트 props 및 상태 바인딩을 점검하고, Preview/FLOW/DIAGRAM/CODE 연동 데이터를 연결합니다.")
    elif file_type == "VUE":
        guides.append("template/script 영역의 바인딩과 조건 렌더링을 점검하고, 상태 연동 로직을 반영합니다.")
    elif file_type == "JAVA":
        guides.append("API 응답 DTO 또는 서비스 로직에서 노드별 기획 정보와 상태값을 내려주도록 수정합니다.")
    elif file_type == "SQL":
        guides.append("조회 컬럼 또는 저장 구조가 새 기획 항목을 반영할 수 있도록 SQL 구문을 점검합니다.")
    elif file_type == "PYTHON":
        guides.append("그래프 노드 또는 후처리 로직에서 구조화된 응답 형식을 유지하도록 수정합니다.")
    else:
        guides.append("해당 파일의 역할에 맞게 렌더링 또는 데이터 전달 구조를 보완합니다.")

    if description:
        guides.append(f"기획 설명 기준: {description}")

    return guides


def _build_items_from_code_input(
    code_input: list[dict[str, Any]],
    selected_node_id: str | None,
    modified_node_ids: list[str],
) -> list[dict[str, Any]]:
    modified_set = set(modified_node_ids)
    items: list[dict[str, Any]] = []

    for index, entry in enumerate(code_input, start=1):
        node_id = entry.get("node_id", "")
        source_file = entry.get("source_file", "")
        component_name = entry.get("component_name", "")
        file_type = _detect_file_type(source_file, entry.get("recommended_target", ""))

        status = "default"
        highlight = None

        if node_id in modified_set:
            status = "modified"
            highlight = {"color": "#F97316", "reason": "modified"}

        if selected_node_id and node_id == selected_node_id:
            if status == "modified":
                status = "selected_modified"
                highlight = {"color": "#F97316", "reason": "selected_modified"}
            else:
                status = "selected"
                highlight = {"color": "#8B5CF6", "reason": "selected"}

        title = component_name or f"모듈 {index}"

        items.append(
            {
                "item_no": index,
                "node_id": node_id,
                "title": title,
                "file_name": source_file or f"unknown_{index}",
                "file_type": file_type,
                "badge": "Update Required",
                "status": status,
                "highlight": highlight,
                "reason": f"'{title}' 모듈 반영을 위한 소스 수정이 필요합니다.",
                "guides": _make_update_guide(
                    title=title,
                    description="",
                    file_type=file_type,
                    component_name=component_name,
                ),
            }
        )

    return items


def _build_items_from_nodes(
    nodes: list[dict[str, Any]],
    selected_node_id: str | None,
    modified_node_ids: list[str],
) -> list[dict[str, Any]]:
    modified_set = set(modified_node_ids)
    leaves = _flatten_leaf_nodes(nodes)
    items: list[dict[str, Any]] = []

    for index, leaf in enumerate(leaves, start=1):
        node_id = leaf.get("node_id", "")
        title = _normalize_title(leaf.get("title", ""))
        description = leaf.get("description", "")
        source_file = leaf.get("source_file", "")
        component_name = leaf.get("component_name", "")

        code_hint = leaf.get("code_hint", {}) or {}
        file_type = _detect_file_type(source_file, code_hint.get("recommended_target", ""))

        status = "default"
        highlight = None

        if node_id in modified_set:
            status = "modified"
            highlight = {"color": "#F97316", "reason": "modified"}

        if selected_node_id and node_id == selected_node_id:
            if status == "modified":
                status = "selected_modified"
                highlight = {"color": "#F97316", "reason": "selected_modified"}
            else:
                status = "selected"
                highlight = {"color": "#8B5CF6", "reason": "selected"}

        items.append(
            {
                "item_no": index,
                "node_id": node_id,
                "title": title,
                "file_name": source_file or f"unknown_{index}",
                "file_type": file_type,
                "badge": "Update Required",
                "status": status,
                "highlight": highlight,
                "reason": _make_update_reason(title, leaf.get("section_title", "")),
                "guides": _make_update_guide(
                    title=title,
                    description=description,
                    file_type=file_type,
                    component_name=component_name,
                ),
            }
        )

    return items


def _ensure_minimum_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if items:
        return items

    return [
        {
            "item_no": 1,
            "node_id": "2-1",
            "title": "기본 콘텐츠 영역",
            "file_name": "src/components/DefaultContent.tsx",
            "file_type": "REACT",
            "badge": "Update Required",
            "status": "default",
            "highlight": None,
            "reason": "기본 콘텐츠 영역 반영을 위한 소스 수정이 필요합니다.",
            "guides": [
                "기본 콘텐츠 영역 UI를 반영하도록 컴포넌트 구조를 수정합니다.",
                "프론트 화면과 백엔드 응답 구조의 필드를 일치시킵니다.",
            ],
        }
    ]


def code_guide_node(state: dict) -> dict:
    """
    입력 우선순위:
    1) scenario_v1["code_input"]
    2) scenario_v1["nodes"]

    추가 상태:
    - state["selected_node_id"]
    - state["modified_node_ids"]
    """
    scenario_v1 = state.get("scenario_v1", {}) or {}
    selected_node_id = state.get("selected_node_id")
    modified_node_ids = state.get("modified_node_ids", []) or []

    project_name = scenario_v1.get("project_name", "auto-generated-project")
    version = scenario_v1.get("version", "v1.0")

    code_input = scenario_v1.get("code_input", []) or []
    nodes = scenario_v1.get("nodes", []) or []

    if code_input:
        items = _build_items_from_code_input(
            code_input=code_input,
            selected_node_id=selected_node_id,
            modified_node_ids=modified_node_ids,
        )
    else:
        items = _build_items_from_nodes(
            nodes=nodes,
            selected_node_id=selected_node_id,
            modified_node_ids=modified_node_ids,
        )

    items = _ensure_minimum_items(items)

    code_guide = {
        "project_name": project_name,
        "version": version,
        "view_type": "CODE",
        "title": "Spec Overview",
        "summary": {
            "total_items": len(items),
            "selected_node_id": selected_node_id,
            "modified_node_ids": modified_node_ids,
        },
        "items": items,
    }

    return {"code_guide": code_guide}