import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas.document import DocumentListItem, DocumentOut, ProgressUpdate
from app.schemas.document_tag import DocumentTagAttach
from app.services import document_service, ingestion_service, storage

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    # Enforce 100MB limit
    content = await file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(status_code=413, detail="File exceeds 100MB limit")
    await file.seek(0)

    doc = await document_service.create_document(db, file)
    background_tasks.add_task(ingestion_service.run_ingestion, str(doc.id))
    return doc


@router.get("", response_model=list[DocumentListItem])
async def list_documents(
    document_tag_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await document_service.list_documents(db, document_tag_id)


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await document_service.get_document(db, doc_id)


@router.post("/{doc_id}/progress", response_model=DocumentOut)
async def update_progress(
    doc_id: uuid.UUID,
    body: ProgressUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await document_service.update_progress(db, doc_id, body)


@router.get("/{doc_id}/file")
async def serve_pdf(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    doc = await document_service.get_document(db, doc_id)
    try:
        data = storage.download_pdf(doc.file_path)
    except Exception:
        raise HTTPException(status_code=404, detail="PDF file not found in storage")
    return StreamingResponse(iter([data]), media_type="application/pdf")


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    doc = await document_service.get_document(db, doc_id)
    try:
        storage.delete_pdf(doc.file_path)
    except Exception:
        pass
    await db.delete(doc)
    await db.commit()


@router.post("/{doc_id}/tags", response_model=DocumentOut)
async def add_document_tag(
    doc_id: uuid.UUID,
    body: DocumentTagAttach,
    db: AsyncSession = Depends(get_db),
):
    return await document_service.add_document_tag(db, doc_id, body.tag_id)


@router.delete("/{doc_id}/tags/{tag_id}", status_code=204)
async def remove_document_tag(
    doc_id: uuid.UUID,
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    await document_service.remove_document_tag(db, doc_id, tag_id)


@router.post("/{doc_id}/reprocess", status_code=202)
async def reprocess_document(
    doc_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    await document_service.get_document(db, doc_id)  # 404 if not found
    background_tasks.add_task(ingestion_service.run_ingestion, str(doc_id))
    return {"detail": "Reprocessing started"}
