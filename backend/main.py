from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.workbench import router as workbench_router

load_dotenv()

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

app.include_router(workbench_router, prefix="/api")


@app.get("/health")
def health() -> dict:
    return {"ok": True}