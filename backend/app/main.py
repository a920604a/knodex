import asyncio
import logging
from contextlib import asynccontextmanager

from arq.connections import ArqRedis, RedisSettings, create_pool
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import AsyncSessionLocal
from app.routers import document_tags, documents, highlights, search, tags
from app.routers import auth, query, admin
from app.services import storage
from app.services.document_tag_service import ensure_default_tags
from app.services.sync_service import sync_minio_to_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

arq_pool: ArqRedis | None = None


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
    global arq_pool
    await run_migrations()
    storage.ensure_bucket()
    async with AsyncSessionLocal() as db:
        await ensure_default_tags(db)
    asyncio.create_task(sync_minio_to_db())
    arq_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    yield
    if arq_pool:
        await arq_pool.close()


app = FastAPI(title="Knodex — Personal Knowledge RAG Platform", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(document_tags.router)
app.include_router(highlights.router)
app.include_router(tags.router)
app.include_router(search.router)
app.include_router(query.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
