"""
hierarchy_utils: analyze_graph 노드들이 공통으로 사용하는 hierarchy 유틸리티.
"""
from __future__ import annotations

from typing import Any, Dict


def _strip_component(comp: Dict[str, Any]) -> Dict[str, Any]:
    """단일 컴포넌트에서 code 필드를 제거한다 (children 재귀 처리)."""
    stripped_areas = [
        {
            "id": area.get("id"),
            "name": area.get("name"),
            "source_file": area.get("source_file"),
            "component_name": area.get("component_name"),
        }
        for area in comp.get("areas", [])
    ]
    stripped_children = [_strip_component(child) for child in comp.get("children", [])]
    return {
        "id": comp.get("id"),
        "name": comp.get("name"),
        "source_file": comp.get("source_file"),
        "areas": stripped_areas,
        "children": stripped_children,
    }


def strip_code(hierarchy: Dict[str, Any]) -> Dict[str, Any]:
    """
    LLM 전송용: code 필드를 재귀적으로 제거한 경량 hierarchy를 반환한다.
    children 구조도 재귀적으로 처리한다.
    """
    return {
        "repository": hierarchy.get("repository", ""),
        "components": [_strip_component(c) for c in hierarchy.get("components", [])],
    }
