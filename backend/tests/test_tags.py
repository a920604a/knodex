import uuid

import pytest


@pytest.mark.asyncio
async def test_create_root_tag(client):
    resp = await client.post("/tags", json={"name": "Science"})
    assert resp.status_code == 201
    assert resp.json()["parent_id"] is None


@pytest.mark.asyncio
async def test_create_child_tag(client):
    parent = await client.post("/tags", json={"name": "Tech"})
    pid = parent.json()["id"]
    child = await client.post("/tags", json={"name": "Python", "parent_id": pid})
    assert child.status_code == 201
    assert child.json()["parent_id"] == pid


@pytest.mark.asyncio
async def test_duplicate_tag_same_parent(client):
    await client.post("/tags", json={"name": "Dup"})
    resp = await client.post("/tags", json={"name": "Dup"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_tag_tree(client):
    resp = await client.get("/tags/tree")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_delete_leaf_tag(client):
    resp = await client.post("/tags", json={"name": f"Leaf-{uuid.uuid4()}"})
    tag_id = resp.json()["id"]
    del_resp = await client.delete(f"/tags/{tag_id}")
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_parent_without_cascade(client):
    parent = await client.post("/tags", json={"name": f"Parent-{uuid.uuid4()}"})
    pid = parent.json()["id"]
    await client.post("/tags", json={"name": f"Child-{uuid.uuid4()}", "parent_id": pid})
    resp = await client.delete(f"/tags/{pid}")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_delete_parent_with_cascade(client):
    parent = await client.post("/tags", json={"name": f"CParent-{uuid.uuid4()}"})
    pid = parent.json()["id"]
    await client.post("/tags", json={"name": f"CChild-{uuid.uuid4()}", "parent_id": pid})
    resp = await client.delete(f"/tags/{pid}?cascade=true")
    assert resp.status_code == 204
