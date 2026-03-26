from __future__ import annotations

import os
import re
from typing import Any


TEXT_EXTENSIONS = (".tsx", ".jsx", ".ts", ".js")
MAX_READ_CHARS = 50000
MAX_COMPONENT_DEPTH = 4
MAX_CHILD_COMPONENTS_PER_FILE = 30
BUILD_ID = "scenario-desc-v2"


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

def preview_node(state: dict) -> dict:
    scenario = state.get("scenario_v1", {})
    nodes = scenario.get("nodes", [])

    html_blocks = []

    def walk(nodes):
        for n in nodes:
            title = n.get("title", "")
            html_blocks.append(f"""
<div style="border:1px solid #e5e7eb; padding:12px;">
  <div style="font-weight:600;">{title}</div>
</div>
""")
            if n.get("children"):
                walk(n["children"])

    walk(nodes)

    return {
        "preview": {
            "html": "\n".join(html_blocks)
        }
    }

def _make_description(label: str, component_name: str, keywords: list[str], source_file: str) -> str:
    print("### NEW _make_description called ###", label, keywords)
    """
    개발자 관점 설명이 아니라 사용자 관점의 요구사항 문장으로 생성한다.
    반환값은 줄바꿈 포함 문자열이며, 프론트에서 그대로 표시하면 된다.
    """
    lines: list[str] = []

    if "card" in keywords or "summary" in keywords:
        lines.extend([
            "1. 사용자는 상품 카드 리스트에서 특정 카드를 클릭하면 카드 상세페이지로 이동할 수 있어야 한다.",
            "2. 상세페이지 진입 시 카드 ID를 기반으로 카드 기본 정보(이름, 이미지, 혜택 요약)를 조회해야 한다.",
            "3. 카드 혜택은 카테고리별(쇼핑, 교통, 외식 등)로 구분하여 표시되어야 한다.",
            "4. 각 혜택 항목은 할인율, 한도, 적용 조건을 포함하여 사용자에게 명확히 전달되어야 한다.",
            "5. 카드 이용 조건(전월 실적, 제외 항목 등)은 별도의 영역에서 상세히 확인할 수 있어야 한다.",
            "6. 사용자는 카드 신청 버튼을 통해 신청 페이지로 이동할 수 있어야 한다.",
            "7. 로그인하지 않은 사용자가 신청 버튼을 클릭할 경우 로그인 페이지로 리다이렉트되어야 한다.",
            "8. 상세페이지는 모바일/태블릿/PC 환경에서 반응형으로 정상 동작해야 한다.",
            "9. 카드 정보 조회 실패 시 사용자에게 오류 메시지를 표시하고 재시도 기능을 제공해야 한다.",
            "10. 상세페이지 로딩 시간은 2초 이내로 유지되도록 API 응답 및 렌더링 성능을 최적화해야 한다.",
        ])

    elif "search" in keywords or "filter" in keywords:
        lines.extend([
            "1. 사용자는 원하는 조건을 입력하여 필요한 정보를 빠르게 찾을 수 있어야 한다.",
            "2. 검색 조건이나 필터는 직관적으로 이해되고 쉽게 변경할 수 있어야 한다.",
            "3. 조건 변경 시 결과 영역은 최신 조건에 맞게 즉시 갱신되어야 한다.",
            "4. 검색 결과가 없을 경우 사용자에게 빈 결과 상태를 명확히 안내해야 한다.",
            "5. 검색 및 필터 기능은 모바일, 태블릿, PC 환경에서 동일한 사용성을 제공해야 한다.",
        ])

    elif "list" in keywords or "table" in keywords:
        lines.extend([
            "1. 사용자는 목록에서 여러 항목을 한눈에 확인할 수 있어야 한다.",
            "2. 각 항목의 핵심 정보는 사용자가 빠르게 비교할 수 있도록 정리되어야 한다.",
            "3. 목록의 각 항목은 클릭 또는 선택을 통해 상세 화면으로 연결될 수 있어야 한다.",
            "4. 데이터가 없는 경우 빈 상태 메시지를 제공해야 한다.",
            "5. 목록 로딩 중에는 사용자에게 적절한 로딩 상태를 표시해야 한다.",
        ])

    elif "detail" in keywords or "info" in keywords:
        lines.extend([
            "1. 사용자는 선택한 항목의 상세 정보를 한 화면에서 명확하게 확인할 수 있어야 한다.",
            "2. 핵심 정보와 부가 정보는 구분된 영역으로 제공되어야 한다.",
            "3. 사용자는 상세 정보 화면에서 다음 행동으로 자연스럽게 이동할 수 있어야 한다.",
            "4. 상세 정보 조회 실패 시 오류 메시지와 재시도 기능을 제공해야 한다.",
            "5. 상세 화면은 다양한 디바이스 환경에서 안정적으로 동작해야 한다.",
        ])

    elif "button" in keywords or "action" in keywords:
        lines.extend([
            "1. 사용자는 주요 액션 버튼을 쉽게 인지하고 클릭할 수 있어야 한다.",
            "2. 버튼 클릭 시 기대한 동작이 즉시 실행되어야 한다.",
            "3. 버튼이 비활성 상태인 경우 그 이유를 사용자가 이해할 수 있어야 한다.",
            "4. 잘못된 입력이나 권한 부족 상황에서는 적절한 안내가 제공되어야 한다.",
            "5. 주요 액션은 모바일, 태블릿, PC 환경에서 일관된 방식으로 동작해야 한다.",
        ])

    elif "modal" in keywords or "popup" in keywords or "dialog" in keywords:
        lines.extend([
            "1. 사용자는 중요한 확인이나 추가 정보를 팝업 형태로 확인할 수 있어야 한다.",
            "2. 팝업에는 현재 맥락에 필요한 정보만 명확하게 제공되어야 한다.",
            "3. 사용자는 확인 또는 취소를 쉽게 선택할 수 있어야 한다.",
            "4. 팝업 외부를 클릭하거나 닫기 버튼을 통해 창을 종료할 수 있어야 한다.",
            "5. 팝업 동작은 다양한 화면 크기에서도 사용성이 유지되어야 한다.",
        ])

    elif "header" in keywords or "nav" in keywords:
        lines.extend([
            "1. 사용자는 상단 네비게이션을 통해 주요 메뉴로 빠르게 이동할 수 있어야 한다.",
            "2. 현재 위치한 메뉴나 화면 상태가 직관적으로 표시되어야 한다.",
            "3. 주요 진입 버튼과 메뉴는 쉽게 식별 가능해야 한다.",
            "4. 상단 영역은 화면 크기에 따라 자연스럽게 재배치되어야 한다.",
            "5. 네비게이션 동작은 일관되고 예측 가능해야 한다.",
        ])

    elif "footer" in keywords:
        lines.extend([
            "1. 사용자는 화면 하단에서 부가 정보와 추가 링크를 확인할 수 있어야 한다.",
            "2. 하단 영역은 본문과 명확히 구분되어야 한다.",
            "3. 공지, 고객지원, 약관 등 보조 정보는 쉽게 접근 가능해야 한다.",
            "4. 하단 링크는 모든 디바이스 환경에서 정상 동작해야 한다.",
            "5. 하단 정보는 화면 전체 흐름을 방해하지 않도록 간결하게 제공되어야 한다.",
        ])

    else:
        lines.extend([
            f"1. 사용자는 {label}에서 필요한 정보를 직관적으로 확인할 수 있어야 한다.",
            f"2. 사용자는 {label}와 상호작용하여 다음 단계로 자연스럽게 이동할 수 있어야 한다.",
            f"3. {label}의 주요 정보는 명확하고 이해하기 쉽게 제공되어야 한다.",
            f"4. {label}은(는) 모바일, 태블릿, PC 환경에서 안정적으로 동작해야 한다.",
            f"5. {label}에서 오류가 발생할 경우 사용자에게 적절한 안내와 재시도 수단을 제공해야 한다.",
        ])

    return "\n".join(lines)


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


def _apply_description_rules(nodes: list[dict[str, Any]]) -> None:
    """
    leaf 노드의 description을 규칙 기반 문장으로 보정한다.
    """
    for root in nodes:
        for section in root.get("children", []) or []:
            for leaf in section.get("children", []) or []:
                title = leaf.get("title", "")
                label = title.split(". ", 1)[1].strip() if ". " in title else title.strip()
                evidence = leaf.get("evidence", {}) or {}
                keywords = evidence.get("keywords", []) or []
                leaf["description"] = _make_description(
                    label=label or "UI 모듈",
                    component_name=leaf.get("component_name", ""),
                    keywords=keywords,
                    source_file=leaf.get("source_file", ""),
                )


def _force_description_overwrite(nodes: list[dict[str, Any]]) -> None:
    for root in nodes:
        for section in root.get("children", []) or []:
            for leaf in section.get("children", []) or []:
                title = leaf.get("title", "")
                label = title.split(". ", 1)[1].strip() if ". " in title else title.strip()
                evidence = leaf.get("evidence", {}) or {}
                keywords = evidence.get("keywords") or leaf.get("keywords") or []
                leaf["description"] = _make_description(
                    label=label or "UI 모듈",
                    component_name=leaf.get("component_name", ""),
                    keywords=keywords,
                    source_file=leaf.get("source_file", ""),
                )


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
    print("### scenario_v1_node entered ###", flush=True)
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
        _force_description_overwrite(fallback_nodes)
        pipeline_inputs = _build_pipeline_inputs(fallback_nodes)
        return {
            "scenario_v1": {
                "project_name": "auto-generated-project",
                "version": "v1.0",
                "debug_build_id": BUILD_ID,
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
    _apply_description_rules(nodes)
    _force_description_overwrite(nodes)
    summary = _build_summary(root_dir, page_paths, leaves)
    pipeline_inputs = _build_pipeline_inputs(nodes)

    scenario_v1 = {
        "project_name": project_name,
        "version": "v1.0",
        "debug_build_id": BUILD_ID,
        "summary": summary,
        "nodes": nodes,
        **pipeline_inputs,
    }

    return {"scenario_v1": scenario_v1}