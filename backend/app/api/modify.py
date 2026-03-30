from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.graph.modify_graph.builder import build_modify_graph

router = APIRouter()


class ModifyCodeRequest(BaseModel):
    area_id: str = Field(..., description="수정할 Area의 ID (analyze-repo 응답의 area id)")
    source_file: str = Field(..., description="대상 파일 상대 경로")
    original_code: str = Field(..., description="원본 코드")
    modification_request: str = Field(..., description="자연어 수정 요청 (한국어)")
    original_flow: Optional[Dict[str, Any]] = Field(
        default=None, description="분석 단계에서 생성된 원본 플로우 JSON (선택적)"
    )
    original_diagram: Optional[str] = Field(
        default=None, description="분석 단계에서 생성된 원본 Mermaid 다이어그램 (선택적)"
    )


@router.post("/modify-code")
def modify_code(payload: ModifyCodeRequest) -> dict:
    """
    선택된 Area의 코드를 자연어 요청에 따라 수정하고 diff, 수정된 flow/diagram을 반환한다.

    반환:
    {
      "area_id": "area-1-1",
      "source_file": "src/components/SearchBar.vue",
      "original_code": "...",
      "modified_code": "...",
      "diff": "@@ -1,5 +1,5 @@\n- ...\n+ ...",
      "modified_flow": { "title": "...", "steps": [...] },
      "modified_diagram": "flowchart LR\n  ..."
    }
    """
    try:
        graph = build_modify_graph()
        invoke_input: Dict[str, Any] = {
            "area_id": payload.area_id,
            "source_file": payload.source_file,
            "original_code": payload.original_code,
            "modification_request": payload.modification_request,
        }
        if payload.original_flow:
            invoke_input["original_flow"] = payload.original_flow
        if payload.original_diagram:
            invoke_input["original_diagram"] = payload.original_diagram

        result = graph.invoke(invoke_input)

        return {
            "area_id": payload.area_id,
            "source_file": payload.source_file,
            "original_code": payload.original_code,
            "modified_code": result.get("modified_code", payload.original_code),
            "diff": result.get("diff", ""),
            "modified_flow": result.get("modified_flow"),
            "flow_changed_steps": result.get("flow_changed_steps", []),
            "modified_diagram": result.get("modified_diagram"),
            "diagram_changed_nodes": result.get("diagram_changed_nodes", []),
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
