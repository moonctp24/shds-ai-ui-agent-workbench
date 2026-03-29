from __future__ import annotations

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.graph.analyze_graph.builder import build_analyze_graph

router = APIRouter()

STEPS = [
    ("repo_load",       "GitHub 레포지토리 클론"),
    ("file_scan",       "파일 목록 수집"),
    ("code_read",       "소스 코드 읽기"),
    ("analyze_code",    "AI 컴포넌트 구조 분석"),
    ("encode_nl",       "AI 자연어 설명 생성"),
    ("encode_flow",     "AI 사용자 플로우 생성"),
    ("encode_diagram",  "AI 다이어그램 생성"),
]

RUNNING_MESSAGES = {
    "repo_load":      "GitHub 레포지토리를 클론하는 중...",
    "file_scan":      "파일 목록을 수집하는 중...",
    "code_read":      "Vue / React 소스 코드를 읽는 중...",
    "analyze_code":   "AI가 컴포넌트 구조를 분석하는 중... (LLM 호출 중, 잠시만 기다려 주세요)",
    "encode_nl":      "AI가 자연어 설명을 생성하는 중...",
    "encode_flow":    "AI가 사용자 플로우를 생성하는 중...",
    "encode_diagram": "AI가 Mermaid 다이어그램을 생성하는 중...",
}

STEP_INDEX = {name: i for i, (name, _) in enumerate(STEPS)}


class AnalyzeRepoRequest(BaseModel):
    repo_url: str = Field(..., min_length=1)
    branch: str = Field(default="main")


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/analyze-repo")
def analyze_repo(payload: AnalyzeRepoRequest):
    """
    LangGraph 각 노드 완료 시점마다 SSE 이벤트를 스트리밍한다.

    이벤트 형식:
      { "type": "progress", "node": "...", "status": "running"|"done", "message": "..." }
      { "type": "result",   "data": { hierarchy } }
      { "type": "error",    "message": "..." }
    """
    def event_stream():
        try:
            graph = build_analyze_graph()

            # 첫 번째 노드 시작 알림
            yield _sse({
                "type": "progress",
                "node": "repo_load",
                "status": "running",
                "message": RUNNING_MESSAGES["repo_load"],
            })

            final_hierarchy: dict = {}
            final_flow: dict = {}
            final_diagram: str = ""

            for event in graph.stream({
                "repo_url": payload.repo_url,
                "branch": payload.branch,
            }):
                for node_name, state_update in event.items():
                    if node_name not in STEP_INDEX:
                        continue

                    # 현재 노드 완료 표시
                    _, label = STEPS[STEP_INDEX[node_name]]
                    yield _sse({
                        "type": "progress",
                        "node": node_name,
                        "status": "done",
                        "message": f"{label} 완료",
                    })

                    if isinstance(state_update, dict):
                        if "hierarchy" in state_update:
                            final_hierarchy = state_update["hierarchy"]
                        if "flow" in state_update:
                            final_flow = state_update["flow"]
                        if "diagram" in state_update:
                            final_diagram = state_update["diagram"]

                    # 다음 노드 시작 알림
                    next_idx = STEP_INDEX[node_name] + 1
                    if next_idx < len(STEPS):
                        next_name, _ = STEPS[next_idx]
                        yield _sse({
                            "type": "progress",
                            "node": next_name,
                            "status": "running",
                            "message": RUNNING_MESSAGES[next_name],
                        })

            # 최종 결과 전송
            result_data = {**final_hierarchy, "flow": final_flow, "diagram": final_diagram}
            yield _sse({"type": "result", "data": result_data})

        except Exception as exc:
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
