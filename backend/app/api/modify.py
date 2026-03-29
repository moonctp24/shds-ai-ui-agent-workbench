from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.graph.modify_graph.builder import build_modify_graph

router = APIRouter()


class ModifyCodeRequest(BaseModel):
    area_id: str = Field(..., description="수정할 Area의 ID (analyze-repo 응답의 area id)")
    source_file: str = Field(..., description="대상 파일 상대 경로")
    original_code: str = Field(..., description="원본 코드")
    modification_request: str = Field(..., description="자연어 수정 요청 (한국어)")


@router.post("/modify-code")
def modify_code(payload: ModifyCodeRequest) -> dict:
    """
    선택된 Area의 코드를 자연어 요청에 따라 수정하고 diff를 반환한다.

    반환:
    {
      "area_id": "area-1-1",
      "source_file": "src/components/SearchBar.vue",
      "original_code": "...",
      "modified_code": "...",
      "diff": "@@ -1,5 +1,5 @@\n- ...\n+ ..."
    }
    """
    try:
        graph = build_modify_graph()
        result = graph.invoke(
            {
                "area_id": payload.area_id,
                "source_file": payload.source_file,
                "original_code": payload.original_code,
                "modification_request": payload.modification_request,
            }
        )

        return {
            "area_id": payload.area_id,
            "source_file": payload.source_file,
            "original_code": payload.original_code,
            "modified_code": result.get("modified_code", payload.original_code),
            "diff": result.get("diff", ""),
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
