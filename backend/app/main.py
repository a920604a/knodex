import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import AsyncSessionLocal
from app.routers import document_tags, documents, highlights, search, tags
from app.services import storage
from app.services.document_tag_service import ensure_default_tags
from app.services.sync_service import sync_minio_to_db

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


async def run_migrations() -> None:
    logger.info("Running DB migrations...")
    proc = await asyncio.create_subprocess_exec(
        "uv", "run", "alembic", "upgrade", "head",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    stdout, _ = await proc.communicate()
    if stdout:
        for line in stdout.decode().splitlines():
            logger.info(line)
    if proc.returncode != 0:
        raise RuntimeError(f"Migration failed (exit {proc.returncode})")
    logger.info("DB migrations complete")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_migrations()
    storage.ensure_bucket()
    async with AsyncSessionLocal() as db:
        await ensure_default_tags(db)
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
