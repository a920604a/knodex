import io
import uuid

import pytest


async def _create_doc(client, tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.pdf_storage_root", str(tmp_path))
    monkeypatch.setattr("app.routers.documents.ingestion_service.run_ingestion", lambda *a, **kw: None)
    resp = await client.post(
        "/documents",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_highlight(client, tmp_path, monkeypatch):
    doc_id = await _create_doc(client, tmp_path, monkeypatch)
    resp = await client.post("/highlights", json={
        "document_id": doc_id,
        "text": "Hello world",
        "page": 1,
        "start_offset": 0,
        "end_offset": 11,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["text"] == "Hello world"
    assert data["tags"] == []


@pytest.mark.asyncio
async def test_create_highlight_invalid_doc(client):
    resp = await client.post("/highlights", json={
        "document_id": str(uuid.uuid4()),
        "text": "test",
        "page": 1,
        "start_offset": 0,
        "end_offset": 4,
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_highlight(client, tmp_path, monkeypatch):
    doc_id = await _create_doc(client, tmp_path, monkeypatch)
    create = await client.post("/highlights", json={
        "document_id": doc_id, "text": "del me", "page": 1, "start_offset": 0, "end_offset": 6,
    })
    h_id = create.json()["id"]
    resp = await client.delete(f"/highlights/{h_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/highlights/{h_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_patch_note(client, tmp_path, monkeypatch):
    doc_id = await _create_doc(client, tmp_path, monkeypatch)
    create = await client.post("/highlights", json={
        "document_id": doc_id, "text": "patch me", "page": 1, "start_offset": 0, "end_offset": 8,
    })
    h_id = create.json()["id"]
    resp = await client.patch(f"/highlights/{h_id}", json={"note": "my note"})
    assert resp.status_code == 200
    assert resp.json()["note"] == "my note"
