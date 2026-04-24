import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.document import DocumentListItem, DocumentOut, ProgressUpdate
from app.schemas.document_tag import DocumentTagAttach
from app.services import document_service, storage

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentOut, status_code=202)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    content = await file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(status_code=413, detail="File exceeds 100MB limit")
    await file.seek(0)

    count = await document_service.get_user_document_count(db, current_user.id)
    if count >= current_user.pdf_limit:
        raise HTTPException(status_code=403, detail="PDF limit reached")

    doc = await document_service.create_document(db, file, current_user.id)

    # Enqueue ingestion task
    from app.main import arq_pool
    if arq_pool:
        await arq_pool.enqueue_job("ingest_document", str(doc.id))
    return doc


@router.get("", response_model=list[DocumentListItem])
async def list_documents(
    document_tag_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await document_service.list_documents(db, current_user.id, document_tag_id)


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await document_service.get_document(db, doc_id, current_user.id)


@router.post("/{doc_id}/progress", response_model=DocumentOut)
async def update_progress(
    doc_id: uuid.UUID,
    body: ProgressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await document_service.update_progress(db, doc_id, body, current_user.id)


@router.get("/{doc_id}/file-url")
async def get_file_url(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await document_service.get_document(db, doc_id, current_user.id)
    if not storage.file_exists(doc.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found in storage")
    url = storage.presign_url(doc.file_path)
    return {"url": url}


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await document_service.get_document(db, doc_id, current_user.id)
    try:
        storage.delete_pdf(doc.file_path)
    except Exception:
        pass
    # Delete vectors from Vectorize
    from app.services.cf_vectorize import delete_by_document
    await delete_by_document(str(doc_id))
    await db.delete(doc)
    await db.commit()


@router.post("/{doc_id}/tags", response_model=DocumentOut)
async def add_document_tag(
    doc_id: uuid.UUID,
    body: DocumentTagAttach,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await document_service.add_document_tag(db, doc_id, body.tag_id, current_user.id)


@router.delete("/{doc_id}/tags/{tag_id}", status_code=204)
async def remove_document_tag(
    doc_id: uuid.UUID,
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await document_service.remove_document_tag(db, doc_id, tag_id, current_user.id)


@router.post("/{doc_id}/reprocess", status_code=202)
async def reprocess_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await document_service.get_document(db, doc_id, current_user.id)
    from app.main import arq_pool
    if arq_pool:
        await arq_pool.enqueue_job("ingest_document", str(doc_id))
    return {"detail": "Reprocessing started"}
