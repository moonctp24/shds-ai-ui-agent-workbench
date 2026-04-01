from __future__ import annotations

from dotenv import load_dotenv

# .env를 가장 먼저 로드 (override=True: 시스템 환경변수보다 .env 우선)
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.analyze import router as analyze_router
from backend.app.api.modify import router as modify_router

app = FastAPI(title="AI UI Agent Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://shds-ai-ui-agent-workbench.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")
app.include_router(modify_router, prefix="/api")


@app.get("/health")
def health() -> dict:
    return {"ok": True}