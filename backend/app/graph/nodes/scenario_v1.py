from __future__ import annotations

import os
import re
from typing import Any


TEXT_EXTENSIONS = (".tsx", ".jsx", ".ts", ".js")
MAX_READ_CHARS = 50000
MAX_COMPONENT_DEPTH = 4
MAX_CHILD_COMPONENTS_PER_FILE = 30


# =========================
# basic utils
# =========================

def _norm(path: str) -> str:
    return os.path.normpath(path).replace("\\", "/")


def _read_text(path: str, max_chars: int = MAX_READ_CHARS) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read(max_chars)
    except OSError:
        return ""


def _relpath(root_dir: str, path: str) -> str:
    try:
        return _norm(os.path.relpath(path, root_dir))
    except Exception:
        return _norm(path)


def _is_text_file(filename: str) -> bool:
    return filename.endswith(TEXT_EXTENSIONS)


def _guess_project_name(root_dir: str) -> str:
    name = os.path.basename(_norm(root_dir)).strip()
    return name or "auto-generated-project"


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    out: list[str] = []
    seen = set()
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


# =========================
# page detection
# =========================

def _find_page_paths(root_dir: str) -> list[str]:
    candidates = [
        "src/app/page.tsx",
        "src/app/page.jsx",
        "app/page.tsx",
        "app/page.jsx",
        "src/pages/index.tsx",
        "src/pages/index.jsx",
        "pages/index.tsx",
        "pages/index.jsx",
    ]

    found: list[str] = []
    for candidate in candidates:
        full = os.path.join(root_dir, candidate)
        if os.path.isfile(full):
            found.append(_norm(full))

    if not found:
        for base_dir in [os.path.join(root_dir, "src", "app"), os.path.join(root_dir, "app")]:
            if not os.path.isdir(base_dir):
                continue
            for current_root, _, files in os.walk(base_dir):
                for name in files:
                    if name in {"page.tsx", "page.jsx"}:
                        found.append(_norm(os.path.join(current_root, name)))

    if not found:
        for base_dir in [os.path.join(root_dir, "src", "pages"), os.path.join(root_dir, "pages")]:
            if not os.path.isdir(base_dir):
                continue
            for current_root, _, files in os.walk(base_dir):
                for name in files:
                    if name in {"index.tsx", "index.jsx"}:
                        found.append(_norm(os.path.join(current_root, name)))

    uniq: list[str] = []
    seen = set()
    for path in found:
        if path not in seen:
            seen.add(path)
            uniq.append(path)
    return uniq


# =========================
# import / jsx parsing
# =========================

DEFAULT_IMPORT_RE = re.compile(
    r'import\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+[\"\']([^\"\']+)[\"\']'
)

NAMED_IMPORT_RE = re.compile(
    r'import\s+\{([^}]+)\}\s+from\s+[\"\']([^\"\']+)[\"\']'
)

JSX_COMPONENT_RE = re.compile(r"<([A-Z][A-Za-z0-9_]*)\b")
HTML_TAG_RE = re.compile(r"<([a-z][a-z0-9-]*)\b")


def _extract_imports(text: str) -> dict[str, str]:
    imports: dict[str, str] = {}

    for match in DEFAULT_IMPORT_RE.finditer(text):
        imports[match.group(1)] = match.group(2)

    for match in NAMED_IMPORT_RE.finditer(text):
        source = match.group(2)
        for raw_name in match.group(1).split(","):
            name = raw_name.strip()
            if not name:
                continue
            if " as " in name:
                name = name.split(" as ")[-1].strip()
            imports[name] = source

    return imports


def _extract_jsx_components(text: str) -> list[str]:
    ignore = {
        "Fragment",
        "Suspense",
        "Link",
        "Image",
        "Head",
        "AnimatePresence",
    }
    result: list[str] = []
    seen = set()
    for name in JSX_COMPONENT_RE.findall(text):
        if name in ignore:
            continue
        if name not in seen:
            seen.add(name)
            result.append(name)
    return result


def _extract_html_tags(text: str) -> set[str]:
    return set(HTML_TAG_RE.findall(text))


def _resolve_component_path(root_dir: str, base_dir: str, import_path: str) -> str:
    if not import_path:
        return ""

    if import_path.startswith("@/"):
        candidates_base = [
            os.path.join(root_dir, "src", import_path[2:]),
            os.path.join(root_dir, import_path[2:]),
        ]
    elif import_path.startswith("./") or import_path.startswith("../"):
        candidates_base = [os.path.normpath(os.path.join(base_dir, import_path))]
    else:
        if not import_path.startswith("components/") and "/" not in import_path and not import_path.startswith("src/"):
            return ""
        candidates_base = [
            os.path.join(root_dir, import_path),
            os.path.join(root_dir, "src", import_path),
        ]

    suffixes = [
        ".tsx",
        ".jsx",
        ".ts",
        ".js",
        "/index.tsx",
        "/index.jsx",
        "/index.ts",
        "/index.js",
    ]

    for base in candidates_base:
        for suffix in suffixes:
            candidate = _norm(base + suffix)
            if os.path.isfile(candidate):
                return candidate

    return ""


# =========================
# semantic helpers
# =========================

def _split_pascal_case(name: str) -> str:
    parts = re.findall(r"[A-Z]+(?=[A-Z][a-z]|[0-9]|\b)|[A-Z]?[a-z]+|[0-9]+", name)
    return " ".join(parts) if parts else name


def _collect_keywords(component_name: str, text: str, html_tags: set[str]) -> list[str]:
    candidates = [
        "header", "footer", "nav", "menu", "banner", "hero",
        "search", "filter", "tab", "form", "input", "select", "dropdown",
        "list", "result", "card", "table", "grid", "detail", "info", "summary",
        "map", "chart", "graph", "calendar", "preview", "diagram",
        "button", "action", "modal", "popup", "dialog", "toast", "alert",
    ]
    lower_name = component_name.lower()
    lower_text = text.lower()
    matched = [
        kw for kw in candidates
        if kw in lower_name or kw in lower_text or kw in html_tags
    ]
    return _dedupe_preserve_order(matched)


def _component_label(name: str, keywords: list[str]) -> str:
    lowered = name.lower()

    token_map = [
        ("header", "헤더 컴포넌트"),
        ("nav", "헤더 네비게이션"),
        ("menu", "메뉴 영역"),
        ("banner", "배너 영역"),
        ("hero", "대표 배너 영역"),
        ("search", "검색 영역"),
        ("filter", "필터 영역"),
        ("tab", "탭 영역"),
        ("form", "입력 폼"),
        ("input", "입력 영역"),
        ("select", "선택 영역"),
        ("dropdown", "드롭다운 영역"),
        ("list", "리스트 영역"),
        ("result", "결과 리스트"),
        ("card", "카드 영역"),
        ("table", "테이블 영역"),
        ("detail", "상세 정보 영역"),
        ("info", "정보 영역"),
        ("summary", "요약 정보 영역"),
        ("map", "지도 영역"),
        ("chart", "차트 영역"),
        ("graph", "그래프 영역"),
        ("preview", "프리뷰 영역"),
        ("diagram", "다이어그램 영역"),
        ("button", "버튼 영역"),
        ("action", "액션 영역"),
        ("modal", "모달 영역"),
        ("popup", "팝업 영역"),
        ("dialog", "다이얼로그 영역"),
        ("toast", "토스트 영역"),
        ("footer", "푸터 영역"),
    ]

    for token, label in token_map:
        if token in lowered:
            return label

    if "header" in keywords:
        return "헤더 컴포넌트"
    if "footer" in keywords:
        return "푸터 영역"
    if "search" in keywords:
        return "검색 영역"
    if "list" in keywords:
        return "리스트 영역"
    if "card" in keywords:
        return "카드 영역"
    if "table" in keywords:
        return "테이블 영역"
    if "modal" in keywords:
        return "모달 영역"

    return f"{_split_pascal_case(name)} 영역"


def _classify_section(component_name: str, text: str, html_tags: set[str]) -> str:
    lower_name = component_name.lower()
    lower_text = text.lower()

    header_signals = ["header", "nav", "gnb", "topbar", "appbar"]
    footer_signals = ["footer", "bottom", "copyright"]

    if any(s in lower_name for s in header_signals) or any(s in lower_text for s in header_signals):
        return "header"
    if any(s in lower_name for s in footer_signals) or any(s in lower_text for s in footer_signals):
        return "footer"
    if "header" in html_tags:
        return "header"
    if "footer" in html_tags:
        return "footer"

    return "body"


def _make_description(label: str, component_name: str, keywords: list[str], source_file: str) -> str:
    keyword_text = ", ".join(keywords[:5]) if keywords else "특정 키워드 없음"
    return (
        f"{label}은(는) 화면에서 독립적으로 렌더링 가능한 최소 UI 단위입니다. "
        f"주요 컴포넌트는 {component_name}이며, 분석 근거 키워드는 [{keyword_text}] 입니다. "
        f"관련 소스는 {source_file} 입니다."
    )


def _make_flow_hint(label: str, keywords: list[str]) -> str:
    if "header" in keywords or "nav" in keywords:
        return f"{label}에서 상단 탐색 및 진입 제어를 수행합니다."
    if "search" in keywords or "filter" in keywords:
        return f"{label}에서 사용자가 조건을 입력하거나 결과 범위를 좁힙니다."
    if "list" in keywords or "card" in keywords or "table" in keywords:
        return f"{label}에서 핵심 데이터를 목록 형태로 확인합니다."
    if "detail" in keywords or "info" in keywords:
        return f"{label}에서 선택된 대상의 상세 정보를 확인합니다."
    if "button" in keywords or "action" in keywords:
        return f"{label}에서 저장, 이동, 실행 등 주요 액션을 수행합니다."
    return f"{label}은(는) 사용자 흐름 중 하나의 독립 단계로 사용됩니다."


def _make_diagram_hint(label: str, section: str) -> str:
    section_name = {
        "header": "Header",
        "body": "Body",
        "footer": "Footer",
    }.get(section, "Body")
    return f'{section_name} 하위 노드 "{label}"'


def _make_code_hint(source_file: str, component_name: str) -> dict[str, Any]:
    ext = os.path.splitext(source_file)[1].lower()
    recommended = "VUE"
    if ext in {".tsx", ".jsx", ".ts", ".js"}:
        recommended = "REACT"
    elif ext == ".py":
        recommended = "PYTHON"
    elif ext == ".sql":
        recommended = "SQL"
    elif ext == ".java":
        recommended = "JAVA"

    return {
        "source_file": source_file,
        "component_name": component_name,
        "recommended_target": recommended,
        "update_required": True,
    }


# =========================
# component scan
# =========================

def _analyze_component_file(
    root_dir: str,
    file_path: str,
    depth: int,
    visited: set[str],
) -> list[dict[str, Any]]:
    file_path = _norm(file_path)
    if (
        not file_path
        or file_path in visited
        or depth > MAX_COMPONENT_DEPTH
        or not os.path.isfile(file_path)
    ):
        return []

    visited.add(file_path)

    text = _read_text(file_path)
    imports = _extract_imports(text)
    jsx_components = _extract_jsx_components(text)[:MAX_CHILD_COMPONENTS_PER_FILE]
    html_tags = _extract_html_tags(text)

    leaves: list[dict[str, Any]] = []

    inferred_name = os.path.splitext(os.path.basename(file_path))[0]
    if inferred_name.lower() not in {"page", "index"}:
        keywords = _collect_keywords(inferred_name, text, html_tags)
        section = _classify_section(inferred_name, text, html_tags)
        label = _component_label(inferred_name, keywords)

        leaves.append({
            "component_name": inferred_name,
            "label": label,
            "section": section,
            "source_file": _relpath(root_dir, file_path),
            "html_tags": sorted(html_tags),
            "depth": depth,
            "keywords": keywords,
            "evidence": {
                "kind": "component-file",
                "keywords": keywords,
            },
        })

    for component_name in jsx_components:
        import_path = imports.get(component_name, "")
        component_path = _resolve_component_path(root_dir, os.path.dirname(file_path), import_path)
        component_text = _read_text(component_path) if component_path else ""
        component_tags = _extract_html_tags(component_text) if component_text else set()

        merged_text = component_text or text
        merged_tags = component_tags or html_tags
        keywords = _collect_keywords(component_name, merged_text, merged_tags)
        section = _classify_section(component_name, merged_text, merged_tags)
        label = _component_label(component_name, keywords)

        leaves.append({
            "component_name": component_name,
            "label": label,
            "section": section,
            "source_file": _relpath(root_dir, component_path) if component_path else _relpath(root_dir, file_path),
            "html_tags": sorted(merged_tags),
            "depth": depth + 1,
            "keywords": keywords,
            "evidence": {
                "kind": "jsx-usage",
                "keywords": keywords,
            },
        })

        if component_path:
            leaves.extend(
                _analyze_component_file(
                    root_dir=root_dir,
                    file_path=component_path,
                    depth=depth + 1,
                    visited=visited,
                )
            )

    return leaves


def _merge_leaf_candidates(leaves: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen = set()

    for leaf in leaves:
        key = (
            leaf.get("component_name", ""),
            leaf.get("source_file", ""),
            leaf.get("section", ""),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(leaf)

    return out


# =========================
# tree build
# =========================

SECTION_META = [
    {
        "section": "header",
        "id": "1",
        "title": "1. Header",
        "description": "화면 상단의 글로벌 네비게이션, 타이틀, 배너 등 상단 UI 그룹입니다.",
    },
    {
        "section": "body",
        "id": "2",
        "title": "2. Body",
        "description": "화면의 주요 콘텐츠와 기능 모듈이 위치하는 핵심 UI 그룹입니다.",
    },
    {
        "section": "footer",
        "id": "3",
        "title": "3. Footer",
        "description": "화면 하단의 보조 정보, 공지, 링크 등이 위치하는 하단 UI 그룹입니다.",
    },
]


def _build_grouped_nodes(project_name: str, leaves: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {"header": [], "body": [], "footer": []}
    for leaf in leaves:
        grouped.setdefault(leaf["section"], []).append(leaf)

    section_nodes: list[dict[str, Any]] = []

    for meta in SECTION_META:
        section = meta["section"]
        items = grouped.get(section, [])
        if not items:
            continue

        children: list[dict[str, Any]] = []
        for idx, item in enumerate(items, start=1):
            child_id = f'{meta["id"]}-{idx}'
            label = item["label"]
            source_file = item["source_file"]
            component_name = item["component_name"]
            keywords = item.get("keywords", [])

            children.append({
                "id": child_id,
                "title": f"{child_id}. {label}",
                "description": _make_description(
                    label=label,
                    component_name=component_name,
                    keywords=keywords,
                    source_file=source_file,
                ),
                "source_file": source_file,
                "component_name": component_name,
                "render_status": "pending",
                "evidence": item.get("evidence", {}),
                "flow_hint": _make_flow_hint(label, keywords),
                "diagram_hint": _make_diagram_hint(label, section),
                "code_hint": _make_code_hint(source_file, component_name),
            })

        section_nodes.append({
            "id": meta["id"],
            "title": meta["title"],
            "description": meta["description"],
            "children": children,
        })

    if not section_nodes:
        section_nodes = [
            {
                "id": "2",
                "title": "2. Body",
                "description": "분석 결과가 부족하여 기본 Body 그룹을 생성했습니다.",
                "children": [
                    {
                        "id": "2-1",
                        "title": "2-1. 기본 콘텐츠 영역",
                        "description": "최소 분석 결과 기반의 기본 UI 모듈입니다.",
                        "source_file": "",
                        "component_name": "Unknown",
                        "render_status": "pending",
                        "evidence": {"kind": "fallback", "keywords": []},
                        "flow_hint": "기본 콘텐츠 영역을 사용자에게 표시합니다.",
                        "diagram_hint": 'Body 하위 노드 "기본 콘텐츠 영역"',
                        "code_hint": {
                            "source_file": "",
                            "component_name": "Unknown",
                            "recommended_target": "REACT",
                            "update_required": True,
                        },
                    }
                ],
            }
        ]

    return [
        {
            "id": "root",
            "title": project_name,
            "description": "코드 구조를 바탕으로 자동 생성된 v1.0 기획 루트입니다.",
            "children": section_nodes,
        }
    ]


# =========================
# summary / pipeline input
# =========================

def _build_summary(root_dir: str, page_paths: list[str], leaves: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "entry_pages": [_relpath(root_dir, p) for p in page_paths],
        "analyzed_files": _dedupe_preserve_order([
            leaf.get("source_file", "") for leaf in leaves if leaf.get("source_file")
        ])[:100],
        "detected_sections": _dedupe_preserve_order([
            leaf.get("section", "") for leaf in leaves if leaf.get("section")
        ]),
        "leaf_count": len(leaves),
    }


def _build_pipeline_inputs(nodes: list[dict[str, Any]]) -> dict[str, Any]:
    flow_items: list[dict[str, Any]] = []
    diagram_items: list[dict[str, Any]] = []
    code_items: list[dict[str, Any]] = []

    if not nodes:
        return {
            "flow_input": [],
            "diagram_input": [],
            "code_input": [],
        }

    root = nodes[0]
    for section in root.get("children", []):
        for leaf in section.get("children", []):
            flow_items.append({
                "node_id": leaf["id"],
                "title": leaf["title"],
                "flow_hint": leaf.get("flow_hint", ""),
            })
            diagram_items.append({
                "node_id": leaf["id"],
                "title": leaf["title"],
                "diagram_hint": leaf.get("diagram_hint", ""),
            })
            code_items.append({
                "node_id": leaf["id"],
                **leaf.get("code_hint", {}),
            })

    return {
        "flow_input": flow_items,
        "diagram_input": diagram_items,
        "code_input": code_items,
    }


# =========================
# public node
# =========================

def scenario_v1_node(state: dict) -> dict:
    root_dir = state.get("local_repo_path", "")

    if not root_dir or not os.path.isdir(root_dir):
        fallback_nodes = [
            {
                "id": "root",
                "title": "auto-generated-project",
                "description": "유효한 프로젝트 경로가 없어 기본 구조를 반환합니다.",
                "children": [
                    {
                        "id": "2",
                        "title": "2. Body",
                        "description": "기본 Body 그룹입니다.",
                        "children": [
                            {
                                "id": "2-1",
                                "title": "2-1. 기본 콘텐츠 영역",
                                "description": "프로젝트 경로가 없어 기본 콘텐츠 노드로 생성되었습니다.",
                                "source_file": "",
                                "component_name": "Unknown",
                                "render_status": "pending",
                                "evidence": {"kind": "fallback", "keywords": []},
                                "flow_hint": "기본 콘텐츠를 표시합니다.",
                                "diagram_hint": 'Body 하위 노드 "기본 콘텐츠 영역"',
                                "code_hint": {
                                    "source_file": "",
                                    "component_name": "Unknown",
                                    "recommended_target": "REACT",
                                    "update_required": True,
                                },
                            }
                        ],
                    }
                ],
            }
        ]
        pipeline_inputs = _build_pipeline_inputs(fallback_nodes)
        return {
            "scenario_v1": {
                "project_name": "auto-generated-project",
                "version": "v1.0",
                "summary": {
                    "entry_pages": [],
                    "analyzed_files": [],
                    "detected_sections": [],
                    "leaf_count": 0,
                },
                "nodes": fallback_nodes,
                **pipeline_inputs,
            }
        }

    page_paths = _find_page_paths(root_dir)
    visited: set[str] = set()
    leaves: list[dict[str, Any]] = []

    if page_paths:
        for page_path in page_paths:
            page_text = _read_text(page_path)
            page_tags = _extract_html_tags(page_text)
            page_keywords = _collect_keywords("page", page_text, page_tags)

            leaves.append({
                "component_name": os.path.splitext(os.path.basename(page_path))[0],
                "label": "페이지 루트",
                "section": "body",
                "source_file": _relpath(root_dir, page_path),
                "html_tags": sorted(page_tags),
                "depth": 0,
                "keywords": page_keywords,
                "evidence": {
                    "kind": "page-entry",
                    "keywords": page_keywords,
                },
            })

            leaves.extend(_analyze_component_file(root_dir, page_path, 0, visited))
    else:
        fallback_dirs = [
            os.path.join(root_dir, "src", "components"),
            os.path.join(root_dir, "components"),
            os.path.join(root_dir, "src", "app"),
            os.path.join(root_dir, "app"),
            os.path.join(root_dir, "src", "pages"),
            os.path.join(root_dir, "pages"),
        ]

        scanned_count = 0
        for base_dir in fallback_dirs:
            if not os.path.isdir(base_dir):
                continue
            for current_root, _, files in os.walk(base_dir):
                for name in files:
                    if not _is_text_file(name):
                        continue
                    path = _norm(os.path.join(current_root, name))
                    if path in visited:
                        continue
                    leaves.extend(_analyze_component_file(root_dir, path, 0, visited))
                    scanned_count += 1
                    if scanned_count >= 20:
                        break
                if scanned_count >= 20:
                    break

    leaves = _merge_leaf_candidates(leaves)
    project_name = _guess_project_name(root_dir)
    nodes = _build_grouped_nodes(project_name, leaves)
    summary = _build_summary(root_dir, page_paths, leaves)
    pipeline_inputs = _build_pipeline_inputs(nodes)

    scenario_v1 = {
        "project_name": project_name,
        "version": "v1.0",
        "summary": summary,
        "nodes": nodes,
        **pipeline_inputs,
    }

    return {"scenario_v1": scenario_v1}