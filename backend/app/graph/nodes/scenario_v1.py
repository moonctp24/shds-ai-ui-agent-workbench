import os
import re


def _read_text(path: str, max_chars: int = 20000) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as handle:
            return handle.read(max_chars)
    except OSError:
        return ""


def _find_page_path(root_dir: str) -> str:
    candidates = [
        "src/app/page.tsx",
        "app/page.tsx",
        "src/pages/index.tsx",
        "pages/index.tsx",
    ]
    for candidate in candidates:
        path = os.path.join(root_dir, candidate)
        if os.path.isfile(path):
            return path
    return ""


def _extract_components(text: str) -> list[str]:
    tags = re.findall(r"<([A-Z][A-Za-z0-9_]*)", text)
    ignore = {"Fragment"}
    uniq: list[str] = []
    for tag in tags:
        if tag in ignore:
            continue
        if tag not in uniq:
            uniq.append(tag)
    return uniq


def _has_tag(text: str, tag: str) -> bool:
    return bool(re.search(rf"<{tag}(\s|>)", text))


def _extract_imports(text: str) -> dict[str, str]:
    imports: dict[str, str] = {}
    default_import = re.compile(r'import\s+([A-Za-z0-9_]+)\s+from\s+["\']([^"\']+)["\']')
    named_import = re.compile(r'import\s+\{([^}]+)\}\s+from\s+["\']([^"\']+)["\']')
    for match in default_import.finditer(text):
        imports[match.group(1)] = match.group(2)
    for match in named_import.finditer(text):
        names = [n.strip().split(" as ")[-1] for n in match.group(1).split(",")]
        for name in names:
            if name:
                imports[name] = match.group(2)
    return imports


def _resolve_component_path(root_dir: str, base_dir: str, import_path: str) -> str:
    if not import_path:
        return ""
    if import_path.startswith("@/"):
        base = os.path.normpath(os.path.join(root_dir, "src", import_path[2:]))
    elif import_path.startswith("./") or import_path.startswith("../"):
        base = os.path.normpath(os.path.join(base_dir, import_path))
    elif import_path.startswith("components/"):
        base = os.path.normpath(os.path.join(root_dir, import_path))
    else:
        base = os.path.normpath(os.path.join(root_dir, import_path))
    candidates = [
        f"{base}.tsx",
        f"{base}.jsx",
        f"{base}.ts",
        f"{base}.js",
        os.path.join(base, "index.tsx"),
        os.path.join(base, "index.jsx"),
        os.path.join(base, "index.ts"),
        os.path.join(base, "index.js"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return ""


def _extract_sections(text: str, components: list[str] | None = None) -> list[str]:
    sections = []
    lower = text.lower()
    if "search" in lower:
        sections.append("검색 영역")
    if "select" in lower or "dropdown" in lower:
        sections.append("Select Box 영역")
    if "map" in lower or "kakao" in lower or "naver" in lower:
        sections.append("지도 영역")
    if "filter" in lower:
        sections.append("필터 영역")
    if "list" in lower:
        sections.append("리스트 영역")
    if "tab" in lower:
        sections.append("탭 영역")
    if components:
        for comp in components:
            comp_lower = comp.lower()
            if "search" in comp_lower:
                sections.append("검색 영역")
            if "select" in comp_lower or "dropdown" in comp_lower:
                sections.append("Select Box 영역")
            if "map" in comp_lower:
                sections.append("지도 영역")
            if "filter" in comp_lower:
                sections.append("필터 영역")
            if "list" in comp_lower:
                sections.append("리스트 영역")
            if "tab" in comp_lower:
                sections.append("탭 영역")
            if "card" in comp_lower:
                sections.append("카드 영역")
            if "detail" in comp_lower:
                sections.append("상세 영역")
    return list(dict.fromkeys(sections))


def _component_to_section(name: str) -> str | None:
    lower = name.lower()
    if "search" in lower:
        return "검색 영역"
    if "select" in lower or "dropdown" in lower:
        return "Select Box 영역"
    if "map" in lower or "kakao" in lower or "naver" in lower:
        return "지도 영역"
    if "filter" in lower:
        return "필터 영역"
    if "list" in lower or "result" in lower:
        return "리스트/결과 영역"
    if "tab" in lower:
        return "탭 영역"
    if "card" in lower:
        return "카드 영역"
    if "detail" in lower:
        return "상세 영역"
    if "popup" in lower or "modal" in lower:
        return "팝업 영역"
    if "header" in lower:
        return "헤더 구성요소"
    if "footer" in lower:
        return "푸터 구성요소"
    return None


def _build_component_children(
    root_dir: str,
    comp_path: str,
    prefix: str,
    depth: int,
    max_depth: int,
    visited: set[str],
) -> list[dict]:
    if not comp_path or comp_path in visited or depth > max_depth:
        return []
    visited.add(comp_path)
    text = _read_text(comp_path)
    imports = _extract_imports(text)
    components = _extract_components(text)
    children: list[dict] = []
    idx = 1
    for comp in components:
        section = _component_to_section(comp)
        title = section or comp
        children.append(
            {
                "id": f"{prefix}-{idx}",
                "title": f"{prefix}-{idx}. {title}",
                "description": f"{title} 컴포넌트입니다.",
            }
        )
        idx += 1
        import_path = imports.get(comp, "")
        nested_path = _resolve_component_path(root_dir, os.path.dirname(comp_path), import_path)
        if nested_path:
            nested_children = _build_component_children(
                root_dir, nested_path, f"{prefix}-{idx-1}", depth + 1, max_depth, visited
            )
            if nested_children:
                children[-1]["children"] = nested_children

    # Add section hints from keywords
    for section in _extract_sections(text, components):
        children.append(
            {
                "id": f"{prefix}-{idx}",
                "title": f"{prefix}-{idx}. {section}",
                "description": f"{section}을 구성하는 UI 영역입니다.",
            }
        )
        idx += 1
    return children

def _build_ui_tree(text: str) -> list[dict]:
    has_header = _has_tag(text, "header") or "Header" in text
    has_footer = _has_tag(text, "footer") or "Footer" in text
    components = _extract_components(text)
    body_children: list[dict] = []

    idx = 1
    for comp in components:
        if comp in {"Header", "Footer"}:
            continue
        body_children.append(
            {
                "id": f"2-{idx}",
                "title": f"2-{idx}. {comp}",
                "description": f"{comp} 컴포넌트입니다. 화면에 데이터/정보를 표시하는 역할입니다.",
            }
        )
        idx += 1

    if _has_tag(text, "button") or "Button" in components:
        body_children.append(
            {
                "id": f"2-{idx}",
                "title": f"2-{idx}. 버튼 컴포넌트",
                "description": "사용자 액션을 위한 버튼 컴포넌트입니다.",
            }
        )

    nodes: list[dict] = []
    if has_header:
        nodes.append(
            {
                "id": "1",
                "title": "1. 헤더",
                "description": "화면 상단 영역(로고/타이틀/네비게이션)을 표시합니다.",
                "children": [
                    {
                        "id": "1-1",
                        "title": "1-1. 헤더 구성요소",
                        "description": "로고, 타이틀, 상단 네비게이션을 포함합니다.",
                    }
                ],
            }
        )
    nodes.append(
        {
            "id": "2",
            "title": "2. 바디",
            "description": "화면의 주요 데이터/콘텐츠를 표시하는 영역입니다.",
            "children": body_children or [
                {
                    "id": "2-1",
                    "title": "2-1. 데이터 표시 컴포넌트",
                    "description": "카드/리스트/지표 등 핵심 정보를 표시합니다.",
                }
            ],
        }
    )
    if has_footer:
        nodes.append(
            {
                "id": "3",
                "title": "3. 푸터",
                "description": "화면 하단 영역(안내/링크/정보)을 표시합니다.",
                "children": [
                    {
                        "id": "3-1",
                        "title": "3-1. 푸터 구성요소",
                        "description": "하단 링크/정보를 포함합니다.",
                    }
                ],
            }
        )
    return nodes


def scenario_v1_node(state: dict) -> dict:
    root_dir = state.get("local_repo_path", "")
    page_path = _find_page_path(root_dir) if root_dir else ""
    if page_path:
        text = _read_text(page_path)
        nodes = _build_ui_tree(text)

        imports = _extract_imports(text)
        components = _extract_components(text)
        body_children = []
        visited: set[str] = set()
        idx = 1
        for comp in components:
            if comp in {"Header", "Footer"}:
                continue
            title = _component_to_section(comp) or comp
            node = {
                "id": f"2-{idx}",
                "title": f"2-{idx}. {title}",
                "description": f"{title} 컴포넌트입니다.",
            }
            import_path = imports.get(comp, "")
            comp_path = _resolve_component_path(root_dir, os.path.dirname(page_path), import_path)
            nested = _build_component_children(root_dir, comp_path, f"2-{idx}", 2, 5, visited)
            if nested:
                node["children"] = nested
            body_children.append(node)
            idx += 1

        if body_children:
            for node in nodes:
                if node["id"] == "2":
                    node["children"] = body_children
                    break
        # Fallback: if still only MainComp, try locating components/main/MainComp.tsx
        if len(body_children) == 1 and "MainComp" in body_children[0]["title"]:
            fallback_path = os.path.join(root_dir, "components", "main", "MainComp.tsx")
            if os.path.isfile(fallback_path):
                nested = _build_component_children(root_dir, fallback_path, "2-1", 2, 6, visited)
                if nested:
                    body_children[0]["children"] = nested
    else:
        nodes = [
            {
                "id": "1",
                "title": "1. 헤더",
                "description": "화면 상단 영역(로고/타이틀/네비게이션)을 표시합니다.",
            },
            {
                "id": "2",
                "title": "2. 바디",
                "description": "화면의 주요 데이터/콘텐츠를 표시하는 영역입니다.",
            },
            {
                "id": "3",
                "title": "3. 푸터",
                "description": "화면 하단 영역(안내/링크/정보)을 표시합니다.",
            },
        ]

    scenario_v1 = {
        "project_name": "auto-generated",
        "version": "v1.0",
        "nodes": nodes,
    }
    return {"scenario_v1": scenario_v1}
