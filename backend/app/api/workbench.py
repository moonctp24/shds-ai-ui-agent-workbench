from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from backend.app.graph.builder import build_graph

router = APIRouter()


class AnalyzeRepoRequest(BaseModel):
    repo_url: str = Field(..., min_length=1)
    branch: str = Field("main")


@router.post("/analyze-repo")
def analyze_repo(payload: AnalyzeRepoRequest) -> dict:
    try:
        graph = build_graph()
        result = graph.invoke(
            {
                "repo_url": payload["repo_url"],
                "branch": payload.get("branch", "main"),
            }
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
