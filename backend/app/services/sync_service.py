import logging

from sqlalchemy import delete, select

from app.database import AsyncSessionLocal
from app.models.document import Document
from app.services import storage

logger = logging.getLogger(__name__)


async def sync_db_with_storage() -> None:
    """
    Startup sync: delete DB records whose MinIO file is missing.
    Runs as a background task so it doesn't block server startup.
    """
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Document.id, Document.title, Document.file_path))
            rows = result.all()

        if not rows:
            logger.info("Sync: no documents to check")
            return

        missing_ids = [
            row.id for row in rows
            if not storage.file_exists(row.file_path)
        ]

        for row in rows:
            exists = storage.file_exists(row.file_path)
            if not exists:
                logger.warning(
                    "Sync: document id=%s title=%r file_path=%r not found in MinIO",
                    row.id, row.title, row.file_path,
                )

        if not missing_ids:
            logger.info("Sync: all %d documents are consistent with storage", len(rows))
            return

        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(Document).where(Document.id.in_(missing_ids))
            )
            await db.commit()

        logger.info(
            "Sync: removed %d/%d orphaned DB records (file missing in MinIO)",
            len(missing_ids), len(rows),
        )

    except Exception:
        logger.exception("Sync: unexpected error during DB/storage sync")
