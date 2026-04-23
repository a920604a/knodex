# Startup MinIO → DB Sync

**Date:** 2026-04-23  
**Status:** Approved

## Context

MinIO is the single source of truth for PDF files. The database stores application-level metadata (status, progress, highlights, chunks, tags) that cannot be queried from object storage.

On startup the backend must ensure the DB reflects whatever files exist in MinIO. If a file is in MinIO but has no DB record, a skeleton Document record must be created so the file becomes visible in the app.

The reverse direction (removing DB records when MinIO files are missing) is **explicitly excluded** — MinIO is authoritative, so a missing file in MinIO is a MinIO problem, not a reason to destroy DB state.

## Goals

- On every startup, auto-import any MinIO objects that lack a DB record.
- Non-blocking: sync runs as a background task; the HTTP server accepts requests immediately.
- Idempotent: running the sync twice produces no duplicates and no errors.
- Resilient: a failure in one import does not abort the rest.

## Data Flow

```
lifespan()
 ├─ storage.ensure_bucket()
 └─ asyncio.create_task(sync_minio_to_db())

sync_minio_to_db()
 ├─ storage.list_objects()          → list[str]  (all MinIO keys)
 ├─ SELECT file_path FROM documents → set[str]   (all known paths)
 ├─ new_keys = minio_keys - db_paths             (Python set diff)
 └─ for key in new_keys:
     ├─ title = parse_title(key)
     └─ INSERT Document(file_path=key, title=title, status="unread", progress=0.0)
```

## File Changes

| File | Change |
|---|---|
| `app/services/storage.py` | Add `list_objects() -> list[str]` |
| `app/services/sync_service.py` | Full rewrite: MinIO→DB direction only |
| `app/main.py` | Rename import `sync_db_with_storage` → `sync_minio_to_db` |

## Title Parsing

MinIO key format: `{uuid}_{original_filename}`

```
"3f2a1bcd_論文草稿.pdf"  →  "論文草稿"
```

Rules:
1. Split on first `_`, take the right part.
2. Strip trailing file extension (`.pdf`, case-insensitive).
3. If the key contains no `_`, use the full key as title (graceful fallback for non-standard keys).

## Error Handling

| Situation | Behaviour |
|---|---|
| MinIO unreachable at startup | Log exception, skip sync entirely, server starts normally |
| Single INSERT fails (e.g. constraint) | Log warning with key name, continue remaining keys |
| No new keys found | Log info: "Sync: all N objects already in DB" |
| New keys found and inserted | Log info: "Sync: inserted M new documents (N total in MinIO)" |

## What This Does NOT Do

- Does not delete DB records when MinIO files are missing.
- Does not populate `total_pages` — that requires parsing the PDF and is handled elsewhere.
- Does not re-import documents that already exist in DB (idempotent by design).
