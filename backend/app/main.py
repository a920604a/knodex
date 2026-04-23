import asyncio
import logging
from contextlib import asynccontextmanager

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import document_tags, documents, highlights, search, tags
from app.services import storage
from app.services.sync_service import sync_minio_to_db

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


def _do_migrate() -> None:
    cfg = Config("alembic.ini")
    command.upgrade(cfg, "head")
    

async def run_migrations() -> None:
    logger.info("Running DB migrations...")
    await asyncio.to_thread(_do_migrate)
    logger.info("DB migrations complete")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_migrations()
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
app.include_router(document_tags.router)
app.include_router(highlights.router)
app.include_router(tags.router)
app.include_router(search.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
