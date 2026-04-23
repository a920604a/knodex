import io
import uuid

import pytest


@pytest.mark.asyncio
async def test_upload_pdf(client, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.storage.upload_pdf", lambda *a, **kw: f"{uuid.uuid4()}_test.pdf")
    monkeypatch.setattr("app.routers.documents.ingestion_service.run_ingestion", lambda *a, **kw: None)

    pdf_bytes = b"%PDF-1.4 fake"
    resp = await client.post(
        "/documents",
        files={"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "test"
    assert data["status"] == "unread"
    assert data["progress"] == 0.0


@pytest.mark.asyncio
async def test_upload_non_pdf_rejected(client):
    resp = await client.post(
        "/documents",
        files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_documents_empty(client):
    resp = await client.get("/documents")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_get_document_not_found(client):
    resp = await client.get(f"/documents/{uuid.uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_progress_update(client, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.storage.upload_pdf", lambda *a, **kw: f"{uuid.uuid4()}_book.pdf")
    monkeypatch.setattr("app.routers.documents.ingestion_service.run_ingestion", lambda *a, **kw: None)

    # Upload first
    pdf_bytes = b"%PDF-1.4 fake"
    resp = await client.post(
        "/documents",
        files={"file": ("book.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    doc_id = resp.json()["id"]

    # Update to done
    resp = await client.post(f"/documents/{doc_id}/progress", json={"status": "done"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"
    assert resp.json()["progress"] == 1.0


@pytest.mark.asyncio
async def test_document_list_item_includes_updated_at_and_document_tags(client, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.storage.upload_pdf", lambda *a, **kw: f"{uuid.uuid4()}_book.pdf")
    monkeypatch.setattr("app.routers.documents.ingestion_service.run_ingestion", lambda *a, **kw: None)

    await client.post(
        "/documents",
        files={"file": ("book.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    resp = await client.get("/documents")
    assert resp.status_code == 200
    item = resp.json()[0]
    assert "updated_at" in item
    assert item["document_tags"] == []
