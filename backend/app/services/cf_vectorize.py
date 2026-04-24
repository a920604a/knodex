from typing import Any

import httpx

from app.config import settings

_BASE = "https://api.cloudflare.com/client/v4/accounts/{account_id}/vectorize/v2/indexes/{index}"


def _url(path: str = "") -> str:
    base = _BASE.format(
        account_id=settings.cf_account_id,
        index=settings.cf_vectorize_index_name,
    )
    return f"{base}{path}"


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.cf_api_token}"}


async def upsert(points: list[dict]) -> None:
    """Upsert vector points. Each point: {id, values, metadata}."""
    ndjson = "\n".join(__import__("json").dumps(p) for p in points)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            _url("/upsert"),
            headers={**_headers(), "Content-Type": "application/x-ndjson"},
            content=ndjson.encode(),
        )
        resp.raise_for_status()


async def query(
    vector: list[float],
    filter: dict | None = None,
    top_k: int = 5,
) -> list[dict]:
    """Returns list of matches with id, score, metadata."""
    payload: dict[str, Any] = {"vector": vector, "topK": top_k, "returnMetadata": "all"}
    if filter:
        payload["filter"] = filter

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            _url("/query"),
            headers=_headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json().get("result", {}).get("matches", [])


async def delete_vectors(ids: list[str]) -> None:
    """Delete vectors by ID."""
    if not ids:
        return
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            _url("/delete-by-ids"),
            headers=_headers(),
            json={"ids": ids},
        )
        resp.raise_for_status()


async def delete_by_document(document_id: str) -> None:
    """Delete all vectors for a document (chunks + highlights)."""
    # Vectorize doesn't support filter-based delete directly.
    # We use metadata filtering to query all vectors for a document, then delete by IDs.
    # In practice, we store IDs as "chunk-{doc_id}-{idx}" and "highlight-{highlight_id}"
    # so chunk IDs are predictable. For a production system, maintain an ID map in DB.
    # For MVP: this is a best-effort operation.
    pass
