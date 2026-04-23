import io
import uuid

import pytest


async def _upload_pdf(client, tmp_path, monkeypatch, filename: str = "book.pdf") -> dict:
    monkeypatch.setattr("app.services.storage.upload_pdf", lambda *a, **kw: f"{uuid.uuid4()}_{filename}")
    monkeypatch.setattr("app.routers.documents.ingestion_service.run_ingestion", lambda *a, **kw: None)
    resp = await client.post(
        "/documents",
        files={"file": (filename, io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_create_document_tag_tree(client):
    seed = await client.get("/document-tags/tree")
    assert seed.status_code == 200

    parent = await client.post("/document-tags", json={"name": f"ML-{uuid.uuid4()}"})
    assert parent.status_code == 201

    child = await client.post(
        "/document-tags",
        json={"name": f"NLP-{uuid.uuid4()}", "parent_id": parent.json()["id"]},
    )
    assert child.status_code == 201

    tree = await client.get("/document-tags/tree")
    assert tree.status_code == 200
    created_parent = next((node for node in tree.json() if node["id"] == parent.json()["id"]), None)
    assert created_parent is not None
    assert created_parent["children"][0]["id"] == child.json()["id"]


@pytest.mark.asyncio
async def test_document_tags_bootstrap_with_default_topics(client):
    resp = await client.get("/document-tags")
    assert resp.status_code == 200

    names = {tag["name"] for tag in resp.json()}
    assert {"技術", "產品", "設計", "商業", "研究", "教學", "案例", "未分類", "AI", "Data", "自動化"}.issubset(names)


@pytest.mark.asyncio
async def test_duplicate_document_tag_same_parent_conflicts(client):
    name = f"Topic-{uuid.uuid4()}"
    first = await client.post("/document-tags", json={"name": name})
    assert first.status_code == 201

    duplicate = await client.post("/document-tags", json={"name": name})
    assert duplicate.status_code == 409


@pytest.mark.asyncio
async def test_attach_document_tag_and_filter_documents(client, tmp_path, monkeypatch):
    doc = await _upload_pdf(client, tmp_path, monkeypatch)
    tag = await client.post("/document-tags", json={"name": f"ML-{uuid.uuid4()}"})
    tag_id = tag.json()["id"]

    attach = await client.post(f"/documents/{doc['id']}/tags", json={"tag_id": tag_id})
    assert attach.status_code == 200
    assert attach.json()["document_tags"][0]["id"] == tag_id

    filtered = await client.get("/documents", params={"document_tag_id": tag_id})
    assert filtered.status_code == 200
    assert len(filtered.json()) == 1
    assert filtered.json()[0]["id"] == doc["id"]
    assert filtered.json()[0]["document_tags"][0]["id"] == tag_id


@pytest.mark.asyncio
async def test_attach_document_tag_is_idempotent(client, tmp_path, monkeypatch):
    doc = await _upload_pdf(client, tmp_path, monkeypatch)
    tag = await client.post("/document-tags", json={"name": f"Reading-{uuid.uuid4()}"})
    tag_id = tag.json()["id"]

    first = await client.post(f"/documents/{doc['id']}/tags", json={"tag_id": tag_id})
    second = await client.post(f"/documents/{doc['id']}/tags", json={"tag_id": tag_id})

    assert first.status_code == 200
    assert second.status_code == 200
    assert len(second.json()["document_tags"]) == 1


@pytest.mark.asyncio
async def test_remove_document_tag_link(client, tmp_path, monkeypatch):
    doc = await _upload_pdf(client, tmp_path, monkeypatch)
    tag = await client.post("/document-tags", json={"name": f"Systems-{uuid.uuid4()}"})
    tag_id = tag.json()["id"]

    await client.post(f"/documents/{doc['id']}/tags", json={"tag_id": tag_id})
    remove = await client.delete(f"/documents/{doc['id']}/tags/{tag_id}")
    assert remove.status_code == 204

    doc_resp = await client.get(f"/documents/{doc['id']}")
    assert doc_resp.status_code == 200
    assert doc_resp.json()["document_tags"] == []


@pytest.mark.asyncio
async def test_delete_document_tag_cascade_removes_children_and_links(client, tmp_path, monkeypatch):
    doc = await _upload_pdf(client, tmp_path, monkeypatch)
    parent = await client.post("/document-tags", json={"name": f"Root-{uuid.uuid4()}"})
    parent_id = parent.json()["id"]
    child = await client.post(
        "/document-tags",
        json={"name": f"Leaf-{uuid.uuid4()}", "parent_id": parent_id},
    )
    child_id = child.json()["id"]

    attach = await client.post(f"/documents/{doc['id']}/tags", json={"tag_id": child_id})
    assert attach.status_code == 200

    no_cascade = await client.delete(f"/document-tags/{parent_id}")
    assert no_cascade.status_code == 409

    cascade = await client.delete(f"/document-tags/{parent_id}?cascade=true")
    assert cascade.status_code == 204

    doc_resp = await client.get(f"/documents/{doc['id']}")
    assert doc_resp.status_code == 200
    assert doc_resp.json()["document_tags"] == []


@pytest.mark.asyncio
async def test_filter_documents_with_missing_document_tag_returns_404(client):
    resp = await client.get("/documents", params={"document_tag_id": str(uuid.uuid4())})
    assert resp.status_code == 404
