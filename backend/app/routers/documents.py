import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas.document import DocumentListItem, DocumentOut, ProgressUpdate
from app.services import document_service, ingestion_service

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
async def list_documents(db: AsyncSession = Depends(get_db)):
    return await document_service.list_documents(db)


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
    pdf_path = Path(settings.pdf_storage_root) / doc.file_path
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
    return FileResponse(str(pdf_path), media_type="application/pdf")


@router.post("/{doc_id}/reprocess", status_code=202)
async def reprocess_document(
    doc_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    await document_service.get_document(db, doc_id)  # 404 if not found
    background_tasks.add_task(ingestion_service.run_ingestion, str(doc_id))
    return {"detail": "Reprocessing started"}
