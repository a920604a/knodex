import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import documents, highlights, search, tags
from app.services import storage
from app.services.sync_service import sync_minio_to_db

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    storage.ensure_bucket()
    asyncio.create_task(sync_minio_to_db())
    yield


app = FastAPI(title="Knodex — PDF Knowledge Reader", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # "http://localhost:5173",
        # "https://<你的帳號>.github.io",  # 替換成實際 GitHub 帳號
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(highlights.router)
app.include_router(tags.router)
app.include_router(search.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
