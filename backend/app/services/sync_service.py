import logging

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.document import Document
from app.services import storage

logger = logging.getLogger(__name__)


def _parse_title(key: str) -> str:
    name = key.split("_", 1)[1] if "_" in key else key
    if name.lower().endswith(".pdf"):
        name = name[:-4]
    return name


async def sync_minio_to_db() -> None:
    try:
        minio_keys = set(storage.list_objects())

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Document.file_path))
            db_paths = {row.file_path for row in result.all()}

        new_keys = minio_keys - db_paths

        if not new_keys:
            logger.info("Sync: all %d MinIO objects already in DB", len(minio_keys))
            return

        async with AsyncSessionLocal() as db:
            for key in new_keys:
                doc = Document(title=_parse_title(key), file_path=key)
                db.add(doc)
                logger.info("Sync: importing %r", key)
            await db.commit()

        logger.info(
            "Sync: inserted %d new documents (%d total in MinIO)",
            len(new_keys), len(minio_keys),
        )

    except Exception:
        logger.exception("Sync: unexpected error during MinIO→DB sync")
