import os
import re
from typing import Any


# =========================
# File / text utilities
# =========================

TEXT_EXTENSIONS = (".tsx", ".jsx", ".ts", ".js")
MAX_READ_CHARS = 40000
MAX_COMPONENT_DEPTH = 4
MAX_CHILD_COMPONENTS_PER_FILE = 25


def _read_text(path: str, max_chars: int = MAX_READ_CHARS) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as handle:
            return handle.read(max_chars)
    except OSError:
        return ""


def _norm(path: str) -> str:
    return os.path.normpath(path).replace("\\", "/")


def _relpath(root_dir: str, path: str) -> str:
    try:
        return _norm(os.path.relpath(path, root_dir))
    except Exception:
        return _norm(path)


def _safe_listdir(path: str) -> list[str]:
    try:
        return os.listdir(path)
    except OSError:
        return []


def _is_text_file(path: str) -> bool:
    return path.endswith(TEXT_EXTENSIONS)


# =========================
# Page entry detection
# =========================

def _find_page_paths(root_dir: str) -> list[str]:
    """
    프로젝트의 대표 page 파일 후보를 찾는다.
    우선순위는 메인 진입점 -> app router/page -> pages/index 순.
    """
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

    # fallback: app/*/page.tsx도 허용
    if not found:
        for base_dir in [os.path.join(root_dir, "src", "app"), os.path.join(root_dir, "app")]:
            if not os.path.isdir(base_dir):
                continue
            for current_root, _, files in os.walk(base_dir):
                for name in files:
                    if name in {"page.tsx", "page.jsx"}:
                        found.append(_norm(os.path.join(current_root, name)))

    # pages router fallback
    if not found:
        for base_dir in [os.path.join(root_dir, "src", "pages"), os.path.join(root_dir, "pages")]:
            if not os.path.isdir(base_dir):
                continue
            for current_root, _, files in os.walk(base_dir):
                for name in files:
                    if name in {"index.tsx", "index.jsx"}:
                        found.append(_norm(os.path.join(current_root, name)))

    # 중복 제거
    uniq: list[str] = []
    seen = set()
    for path in found:
        if path not in seen:
            seen.add(path)
            uniq.append(path)
    return uniq


# =========================
# Import / component parsing
# =========================

DEFAULT_IMPORT_RE = re.compile(
    r'import\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+[\"\']([^\"\']+)[\"\']'
)

NAMED_IMPORT_RE = re.compile(
    r'import\s+\{([^}]+)\}\s+from\s+[\"\']([^\"\']+)[\"\']'
)

JSX_COMPONENT_RE = re.compile(r"<([A-Z][A-Za-z0-9_]*)\b")
HTML_TAG_RE = re.compile(r"<([a-z][a-z0-9-]*)\b")
FUNCTION_COMPONENT_RE = re.compile(
    r"(?:export\s+default\s+function|export\s+function|function|const)\s+([A-Z][A-Za-z0-9_]*)"
)


def _extract_imports(text: str) -> dict[str, str]:
    imports: dict[str, str] = {}

    for match in DEFAULT_IMPORT_RE.finditer(text):
        imports[match.group(1)] = match.group(2)

    for match in NAMED_IMPORT_RE.finditer(text):
        raw_names = match.group(1).split(",")
        source = match.group(2)
        for raw in raw_names:
            name = raw.strip()
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
        "ErrorBoundary",
        "AnimatePresence",
        "Link",  # next/link 같은 경우 leaf로 보지 않아도 됨
    }
    uniq: list[str] = []
    seen = set()

    for name in JSX_COMPONENT_RE.findall(text):
        if name in ignore:
            continue
        if name not in seen:
            seen.add(name)
            uniq.append(name)
    return uniq


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
        # 외부 패키지일 가능성이 큼
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
            path = _norm(base + suffix) if suffix.startswith(".") else _norm(base + suffix)
            if os.path.isfile(path):
                return path

    return ""


# =========================
# Text / semantics helpers
# =========================

def _split_pascal_case(name: str) -> str:
    parts = re.findall(r"[A-Z]+(?=[A-Z][a-z]|[0-9]|\b)|[A-Z]?[a-z]+|[0-9]+", name)
    return " ".join(parts) if parts else name


def _component_label(name: str) -> str:
    base = _split_pascal_case(name).strip()
    mapping = [
        ("Header", "헤더"),
        ("Footer", "푸터"),
        ("Nav", "네비게이션"),
        ("Navigation", "네비게이션"),
        ("Tab", "탭"),
        ("Search", "검색"),
        ("Filter", "필터"),
        ("Form", "입력 폼"),
        ("Input", "입력 필드"),
        ("Select", "선택 박스"),
        ("Dropdown", "드롭다운"),
        ("Modal", "모달"),
        ("Popup", "팝업"),
        ("Dialog", "다이얼로그"),
        ("List", "리스트"),
        ("Result", "결과 목록"),
        ("Card", "카드"),
        ("Table", "테이블"),
        ("Grid", "그리드"),
        ("Detail", "상세 정보"),
        ("Info", "정보 영역"),
        ("Map", "지도"),
        ("Chart", "차트"),
        ("Graph", "그래프"),
        ("Summary", "요약 정보"),
        ("Button", "버튼 영역"),
        ("Action", "액션 영역"),
        ("Hero", "대표 소개 영역"),
        ("Banner", "배너"),
        ("Section", "섹션"),
        ("Content", "콘텐츠 영역"),
    ]
    for token, label in mapping:
        if token.lower() in name.lower():
            return label
    return f"{base} 영역"


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    out: list[str] = []
    seen = set()
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def _contains_any(text: str, words: list[str]) -> bool:
    lower = text.lower()
    return any(word in lower for word in words)


def _guess_project_name(root_dir: str) -> str:
    base = os.path.basename(_norm(root_dir)).strip()
    return base or "auto-generated-project"


# =========================
# Module classification
# =========================

GROUP_RULES = [
    {
        "group_key": "top",
        "group_title": "1. 상단 영역",
        "leaf_prefix": "1",
        "keywords": ["header", "hero", "banner", "nav", "navigation", "gnb", "topbar", "appbar"],
        "description": "화면 상단의 브랜드/타이틀/탐색 요소를 구성하는 그룹입니다.",
    },
    {
        "group_key": "control",
        "group_title": "2. 제어 및 탐색 영역",
        "leaf_prefix": "2",
        "keywords": ["search", "filter", "tab", "select", "dropdown", "input", "form", "sort", "chip"],
        "description": "검색, 필터, 탭, 입력 등 사용자의 조건 설정과 화면 전환을 담당하는 그룹입니다.",
    },
    {
        "group_key": "content",
        "group_title": "3. 주요 콘텐츠 영역",
        "leaf_prefix": "3",
        "keywords": ["list", "result", "card", "table", "grid", "detail", "info", "summary", "content"],
        "description": "핵심 데이터와 정보를 표시하는 본문 그룹입니다.",
    },
    {
        "group_key": "visual",
        "group_title": "4. 시각화 및 보조 영역",
        "leaf_prefix": "4",
        "keywords": ["map", "chart", "graph", "calendar", "timeline", "preview", "diagram"],
        "description": "지도, 차트, 캘린더 등 시각적 표현을 담당하는 그룹입니다.",
    },
    {
        "group_key": "action",
        "group_title": "5. 액션 및 피드백 영역",
        "leaf_prefix": "5",
        "keywords": ["button", "action", "submit", "modal", "popup", "dialog", "toast", "alert"],
        "description": "버튼, 저장, 팝업, 알림 등 사용자 액션과 피드백을 담당하는 그룹입니다.",
    },
    {
        "group_key": "bottom",
        "group_title": "6. 하단 영역",
        "leaf_prefix": "6",
        "keywords": ["footer", "bottom", "copyright"],
        "description": "화면 하단의 안내/링크/부가정보를 구성하는 그룹입니다.",
    },
]


def _classify_group(component_name: str, text: str, html_tags: set[str]) -> str:
    name_lower = component_name.lower()
    text_lower = text.lower()
    tag_signal = " ".join(sorted(html_tags))

    for rule in GROUP_RULES:
        if any(keyword in name_lower for keyword in rule["keywords"]):
            return rule["group_key"]
        if any(keyword in text_lower for keyword in rule["keywords"]):
            return rule["group_key"]
        if any(keyword in tag_signal for keyword in rule["keywords"]):
            return rule["group_key"]

    if "header" in html_tags:
        return "top"
    if "footer" in html_tags:
        return "bottom"
    if "button" in html_tags:
        return "action"
    if any(tag in html_tags for tag in {"input", "select", "form"}):
        return "control"
    if any(tag in html_tags for tag in {"table", "main", "section", "article"}):
        return "content"

    return "content"


def _group_meta(group_key: str) -> dict[str, str]:
    for rule in GROUP_RULES:
        if rule["group_key"] == group_key:
            return {
                "title": rule["group_title"],
                "description": rule["description"],
                "leaf_prefix": rule["leaf_prefix"],
            }
    return {
        "title": "3. 주요 콘텐츠 영역",
        "description": "핵심 데이터와 정보를 표시하는 본문 그룹입니다.",
        "leaf_prefix": "3",
    }


def _module_description(label: str, component_name: str, html_tags: set[str]) -> str:
    tags = sorted(html_tags)
    tags_text = ", ".join(tags[:6]) if tags else "특이 태그 없음"
    return (
        f"{label}을 담당하는 최소 UI 단위입니다. "
        f"주요 컴포넌트명은 {component_name}이며, 분석 시점 기준 태그 신호는 [{tags_text}] 입니다."
    )


# =========================
# Component graph scan
# =========================

def _analyze_component_file(
    root_dir: str,
    file_path: str,
    depth: int,
    visited: set[str],
) -> list[dict[str, Any]]:
    """
    page와 연결된 하위 컴포넌트를 수집한다.
    단, 최종 결과는 '컴포넌트 트리'가 아니라 leaf 후보 목록이다.
    """
    file_path = _norm(file_path)
    if not file_path or file_path in visited or depth > MAX_COMPONENT_DEPTH or not os.path.isfile(file_path):
        return []

    visited.add(file_path)
    text = _read_text(file_path)
    imports = _extract_imports(text)
    jsx_components = _extract_jsx_components(text)[:MAX_CHILD_COMPONENTS_PER_FILE]
    html_tags = _extract_html_tags(text)

    leaves: list[dict[str, Any]] = []

    # 현재 파일 자체도 하나의 분석 단위로 남긴다.
    inferred_name = os.path.splitext(os.path.basename(file_path))[0]
    if inferred_name.lower() not in {"page", "index"}:
        group_key = _classify_group(inferred_name, text, html_tags)
        label = _component_label(inferred_name)
        leaves.append(
            {
                "component_name": inferred_name,
                "label": label,
                "group_key": group_key,
                "source_file": _relpath(root_dir, file_path),
                "html_tags": sorted(html_tags),
                "depth": depth,
                "evidence": {
                    "kind": "component-file",
                    "keywords": _collect_keywords(inferred_name, text, html_tags),
                },
            }
        )

    # 자식 컴포넌트 수집
    for component_name in jsx_components:
        import_path = imports.get(component_name, "")
        component_path = _resolve_component_path(root_dir, os.path.dirname(file_path), import_path)
        component_text = _read_text(component_path) if component_path else ""
        component_tags = _extract_html_tags(component_text) if component_text else set()
        group_key = _classify_group(component_name, component_text or text, component_tags or html_tags)
        label = _component_label(component_name)

        leaves.append(
            {
                "component_name": component_name,
                "label": label,
                "group_key": group_key,
                "source_file": _relpath(root_dir, component_path) if component_path else _relpath(root_dir, file_path),
                "html_tags": sorted(component_tags or html_tags),
                "depth": depth + 1,
                "evidence": {
                    "kind": "jsx-usage",
                    "keywords": _collect_keywords(component_name, component_text or text, component_tags or html_tags),
                },
            }
        )

        if component_path:
            nested = _analyze_component_file(root_dir, component_path, depth + 1, visited)
            leaves.extend(nested)

    return leaves


def _collect_keywords(component_name: str, text: str, html_tags: set[str]) -> list[str]:
    candidates = [
        "header", "footer", "search", "filter", "tab", "form", "input", "select",
        "dropdown", "list", "result", "card", "table", "detail", "info", "summary",
        "map", "chart", "graph", "calendar", "button", "action", "modal", "popup", "dialog"
    ]
    lower_name = component_name.lower()
    lower_text = text.lower()
    matched = [kw for kw in candidates if kw in lower_name or kw in lower_text or kw in html_tags]
    return _dedupe_preserve_order(matched)


# =========================
# Scenario tree building
# =========================

def _merge_leaf_candidates(leaves: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    같은 컴포넌트가 여러 경로에서 발견되더라도 source_file 기준으로 1회 정리.
    """
    out: list[dict[str, Any]] = []
    seen = set()

    for leaf in leaves:
        key = (leaf.get("component_name", ""), leaf.get("source_file", ""))
        if key in seen:
            continue
        seen.add(key)
        out.append(leaf)

    return out


def _build_grouped_nodes(project_name: str, leaves: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for leaf in leaves:
        grouped.setdefault(leaf["group_key"], []).append(leaf)

    nodes: list[dict[str, Any]] = []

    # 규칙 정의 순서대로 2-Depth 그룹 생성
    for rule in GROUP_RULES:
        group_key = rule["group_key"]
        group_items = grouped.get(group_key, [])
        if not group_items:
            continue

        group_meta = _group_meta(group_key)
        prefix = group_meta["leaf_prefix"]
        children: list[dict[str, Any]] = []

        for index, item in enumerate(group_items, start=1):
            leaf_id = f"{prefix}-{index}"
            title = f"{leaf_id}. {item['label']}"
            description = _module_description(
                label=item["label"],
                component_name=item["component_name"],
                html_tags=set(item.get("html_tags", [])),
            )

            children.append(
                {
                    "id": leaf_id,
                    "title": title,
                    "description": description,
                    "source_file": item.get("source_file", ""),
                    "component_name": item.get("component_name", ""),
                    "render_status": "pending",
                    "evidence": item.get("evidence", {}),
                }
            )

        nodes.append(
            {
                "id": prefix,
                "title": group_meta["title"],
                "description": group_meta["description"],
                "children": children,
            }
        )

    if not nodes:
        nodes = [
            {
                "id": "1",
                "title": "1. 주요 화면 영역",
                "description": "코드 기반 분석 결과를 충분히 식별하지 못해 기본 기획 그룹으로 생성된 영역입니다.",
                "children": [
                    {
                        "id": "1-1",
                        "title": "1-1. 기본 콘텐츠 영역",
                        "description": "최소 분석 결과에 기반한 기본 UI 모듈입니다.",
                        "source_file": "",
                        "component_name": "Unknown",
                        "render_status": "pending",
                        "evidence": {"kind": "fallback", "keywords": []},
                    }
                ],
            }
        ]

    return [
        {
            "id": "root",
            "title": project_name,
            "description": "코드 구조를 기반으로 자동 생성된 v1.0 기획 트리입니다.",
            "children": nodes,
        }
    ]


# =========================
# Summary generation
# =========================

def _build_summary(root_dir: str, page_paths: list[str], leaves: list[dict[str, Any]]) -> dict[str, Any]:
    files = _dedupe_preserve_order([leaf.get("source_file", "") for leaf in leaves if leaf.get("source_file")])
    groups = _dedupe_preserve_order([leaf.get("group_key", "") for leaf in leaves if leaf.get("group_key")])

    return {
        "entry_pages": [_relpath(root_dir, path) for path in page_paths],
        "analyzed_files": files[:100],
        "detected_groups": groups,
        "leaf_count": len(leaves),
    }


# =========================
# Public node
# =========================

def scenario_v1_node(state: dict) -> dict:
    """
    LangGraph node 용도:
    input:  state["local_repo_path"]
    output: {"scenario_v1": ...}
    """
    root_dir = state.get("local_repo_path", "")
    if not root_dir or not os.path.isdir(root_dir):
        return {
            "scenario_v1": {
                "project_name": "auto-generated-project",
                "version": "v1.0",
                "summary": {
                    "entry_pages": [],
                    "analyzed_files": [],
                    "detected_groups": [],
                    "leaf_count": 0,
                },
                "nodes": [
                    {
                        "id": "root",
                        "title": "auto-generated-project",
                        "description": "유효한 로컬 프로젝트 경로가 없어 기본 구조로 생성되었습니다.",
                        "children": [
                            {
                                "id": "1",
                                "title": "1. 주요 화면 영역",
                                "description": "기본 그룹입니다.",
                                "children": [
                                    {
                                        "id": "1-1",
                                        "title": "1-1. 기본 콘텐츠 영역",
                                        "description": "프로젝트 경로가 없어 기본 콘텐츠 노드로 생성되었습니다.",
                                        "source_file": "",
                                        "component_name": "Unknown",
                                        "render_status": "pending",
                                        "evidence": {"kind": "fallback", "keywords": []},
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        }

    page_paths = _find_page_paths(root_dir)
    visited: set[str] = set()
    leaves: list[dict[str, Any]] = []

    # page 진입점이 있으면 연결 컴포넌트 위주로 분석
    if page_paths:
        for page_path in page_paths:
            page_text = _read_text(page_path)
            page_tags = _extract_html_tags(page_text)

            # page 자체를 하나의 콘텐츠 단위로 남김
            leaves.append(
                {
                    "component_name": os.path.splitext(os.path.basename(page_path))[0],
                    "label": "페이지 루트",
                    "group_key": _classify_group("page", page_text, page_tags),
                    "source_file": _relpath(root_dir, page_path),
                    "html_tags": sorted(page_tags),
                    "depth": 0,
                    "evidence": {
                        "kind": "page-entry",
                        "keywords": _collect_keywords("page", page_text, page_tags),
                    },
                }
            )

            leaves.extend(_analyze_component_file(root_dir, page_path, depth=0, visited=visited))

    # page를 못 찾으면 components/app/pages 일대를 fallback 분석
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
                    leaves.extend(_analyze_component_file(root_dir, path, depth=0, visited=visited))
                    scanned_count += 1
                    if scanned_count >= 20:
                        break
                if scanned_count >= 20:
                    break

    leaves = _merge_leaf_candidates(leaves)
    project_name = _guess_project_name(root_dir)
    nodes = _build_grouped_nodes(project_name, leaves)
    summary = _build_summary(root_dir, page_paths, leaves)

    scenario_v1 = {
        "project_name": project_name,
        "version": "v1.0",
        "summary": summary,
        "nodes": nodes,
    }

    return {"scenario_v1": scenario_v1}