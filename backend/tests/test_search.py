import io

import pytest


async def _create_doc_with_highlight(client, tmp_path, monkeypatch, title="SearchDoc", text="machine learning"):
    monkeypatch.setattr("app.config.settings.pdf_storage_root", str(tmp_path))
    monkeypatch.setattr("app.routers.documents.ingestion_service.run_ingestion", lambda *a, **kw: None)
    doc_resp = await client.post(
        "/documents",
        files={"file": (f"{title}.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    doc_id = doc_resp.json()["id"]
    await client.post("/highlights", json={
        "document_id": doc_id, "text": text, "page": 1, "start_offset": 0, "end_offset": len(text),
    })
    return doc_id


@pytest.mark.asyncio
async def test_search_empty_q(client):
    resp = await client.get("/search?q=")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_no_results(client):
    resp = await client.get("/search?q=xyznonexistent123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["documents"] == []
    assert data["highlights"] == []


@pytest.mark.asyncio
async def test_search_finds_highlight(client, tmp_path, monkeypatch):
    await _create_doc_with_highlight(client, tmp_path, monkeypatch, text="gradient descent")
    resp = await client.get("/search?q=gradient")
    assert resp.status_code == 200
    data = resp.json()
    assert any("gradient" in h["text"].lower() for h in data["highlights"])
