## 1. Infrastructure & Environment

- [ ] 1.1 新增 Redis container 到 docker-compose.yml（image: redis:7-alpine）
- [ ] 1.2 新增 worker service 到 docker-compose.yml（depends_on: db, redis）
- [ ] 1.3 新增環境變數：`SECRET_KEY`（JWT）、`CF_ACCOUNT_ID`、`CF_API_TOKEN`、`CF_VECTORIZE_INDEX_NAME`、`REDIS_URL` 到 .env.example 和 docker-compose
- [ ] 1.4 在 Cloudflare dashboard 建立 Vectorize index（384 dim，metric: cosine，model: @cf/baai/bge-small-en-v1.5）
- [ ] 1.5 新增 Python 依賴：`arq`, `python-jose`, `passlib[bcrypt]`, `httpx` 到 pyproject.toml

## 2. Auth System

- [ ] 2.1 建立 `app/models/user.py`：User model（id, email, password_hash, role, pdf_limit, daily_query_limit, created_at）
- [ ] 2.2 建立 Alembic migration：新增 users 表
- [ ] 2.3 建立 `app/services/auth_service.py`：register、login、get_current_user（JWT decode）
- [ ] 2.4 建立 `app/routers/auth.py`：POST /auth/register、POST /auth/login、GET /auth/me
- [ ] 2.5 建立 `app/dependencies/auth.py`：`get_current_user` dependency（FastAPI Depends）和 `require_admin` dependency
- [ ] 2.6 建立 admin seed script（`backend/scripts/create_admin.py`）：建立初始 admin 帳號

## 3. Database Schema Changes

- [ ] 3.1 建立 Alembic migration：documents 加 `user_id`（UUID FK → users.id，nullable）、`ingestion_status`（String，default: "pending"）
- [ ] 3.2 建立 Alembic migration：highlights 加 `embed_status`（String，default: "pending"）
- [ ] 3.3 建立 Alembic migration：新增 query_logs 表（id, user_id FK, query_text, response_summary, tokens_used, created_at）

## 4. Per-user Document Isolation

- [ ] 4.1 更新 `app/services/document_service.py`：所有 query 加入 user_id filter（list_documents, get_document, create_document, delete）
- [ ] 4.2 更新 `app/routers/documents.py`：所有端點加入 `current_user = Depends(get_current_user)`，upload 前檢查 pdf_limit
- [ ] 4.3 更新 `app/routers/highlights.py`：加入 `current_user` dependency，確保 highlight 屬於 current_user 的文件

## 5. Cloudflare Integration Client

- [ ] 5.1 建立 `app/services/cf_ai.py`：封裝 CF Workers AI HTTP client，提供 `embed(text) -> list[float]` 和 `generate(prompt) -> str`
- [ ] 5.2 建立 `app/services/cf_vectorize.py`：封裝 CF Vectorize HTTP client，提供 `upsert(points)`, `query(vector, filter, top_k)`, `delete(ids)`

## 6. Async Ingestion Worker

- [ ] 6.1 建立 `backend/worker/` 目錄結構：`__init__.py`, `main.py`（ARQ WorkerSettings）, `tasks.py`
- [ ] 6.2 實作 `tasks.ingest_document(ctx, document_id)`：從 MinIO 下載 PDF → parse → chunk（現有邏輯搬移）→ embed（cf_ai）→ upsert（cf_vectorize）→ 更新 ingestion_status
- [ ] 6.3 更新 `app/routers/documents.py` upload 端點：移除 BackgroundTasks，改為 `await arq_pool.enqueue_job("ingest_document", doc_id)`
- [ ] 6.4 建立 ARQ Redis pool 在 FastAPI lifespan 初始化（`app/main.py`）
- [ ] 6.5 新增 `POST /documents/{doc_id}/reprocess` 端點重新 enqueue（已有端點，改用 arq）

## 7. Highlight Async Embed

- [ ] 7.1 實作 `tasks.embed_highlight(ctx, highlight_id)`：從 DB 取 highlight → embed text → upsert to Vectorize（source_type: "highlight"）→ 更新 embed_status
- [ ] 7.2 更新 `app/routers/highlights.py` POST（建立 highlight）：建立後 `await arq_pool.enqueue_job("embed_highlight", highlight_id)`
- [ ] 7.3 更新 `app/routers/highlights.py` DELETE（刪除 highlight）：刪除後呼叫 `cf_vectorize.delete([highlight_vector_id])`

## 8. RAG Query API

- [ ] 8.1 建立 `app/routers/query.py`：POST /query（需登入）
- [ ] 8.2 實作 daily_query_limit 檢查：query query_logs WHERE user_id = current_user AND created_at >= today UTC，count ≥ limit → 429
- [ ] 8.3 實作 RAG flow：embed query（cf_ai）→ cf_vectorize.query（filter user_id, top_k=5）→ 組 prompt → cf_ai.generate → 回傳 answer + sources
- [ ] 8.4 實作 sources 格式化：從 Vectorize payload 萃取 source_type、document_title、page、content
- [ ] 8.5 query 成功後寫入 query_logs

## 9. Admin Dashboard API

- [ ] 9.1 建立 `app/routers/admin.py`：所有端點加 `require_admin` dependency
- [ ] 9.2 實作 GET /admin/users：join users + count documents + count today query_logs，回傳完整 user stats
- [ ] 9.3 實作 PATCH /admin/users/{user_id}：更新 pdf_limit 和/或 daily_query_limit
- [ ] 9.4 實作 GET /admin/stats：total_users, total_documents, today_total_queries, worker_queue_depth（透過 ARQ 或 Redis LLEN 取得）

## 10. Frontend

- [ ] 10.1 建立 Login / Register 頁面（`frontend/src/pages/AuthPage.tsx`），呼叫 /auth/login 和 /auth/register，儲存 JWT 到 localStorage
- [ ] 10.2 建立 auth context / hook（`useAuth`），提供 current_user 和 logout 功能
- [ ] 10.3 為 API client 加入 Authorization header（Bearer token）
- [ ] 10.4 建立 Query 頁面（`frontend/src/pages/QueryPage.tsx`）：輸入框 + 送出 → 顯示 answer + sources（標示 highlight vs chunk 來源）
- [ ] 10.5 建立 Admin dashboard 頁面（`frontend/src/pages/AdminPage.tsx`）：user 列表 + pdf_limit / daily_query_limit 編輯
- [ ] 10.6 更新 DocumentListPage：未登入時導向 Login；顯示 ingestion_status badge（pending / processing / completed / failed）
- [ ] 10.7 在 ReaderPage highlight 建立後顯示 embed_status 指示器（可選，低優先）
