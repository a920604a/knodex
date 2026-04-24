## Context

Knodex 目前是單人使用的 PDF 閱讀工具，後端為 FastAPI + PostgreSQL + MinIO，已有文件管理、highlight CRUD、tag 系統、關鍵字搜尋和 chunk pipeline（PyMuPDF + tiktoken）。Embedding 欄位是 stub（Text placeholder），尚未有真正的向量搜尋。Ingestion 透過 FastAPI BackgroundTasks 執行，無法獨立擴展、無法 retry。

此次升級目標：加入 Auth、per-user 隔離、真正的向量搜尋（CF Vectorize）、Highlight embed pipeline 和 Admin dashboard。

## Goals / Non-Goals

**Goals:**
- 多使用者系統，每人有獨立文件空間
- Highlight 也進入向量索引，讓 RAG 能回答「你認為重要的是什麼」
- 以 CF Workers AI + CF Vectorize 取代 Qdrant + OpenAI，降低基礎設施複雜度
- 以 Redis Queue + ARQ Worker 取代 BackgroundTasks，支援 retry 和獨立擴展
- Admin 可監控使用狀況並調整 per-user 限額

**Non-Goals:**
- Multi-tenant（無組織 / 工作空間層）
- 即時串流 LLM 回應（MVP 用一次性回應）
- 自訂 embedding 模型或 fine-tuning
- 計費系統

## Decisions

### 1. CF Workers AI + CF Vectorize 取代 Qdrant + OpenAI

**決定**：所有 embedding 和 LLM 推理呼叫 CF Workers AI REST API；向量儲存用 CF Vectorize。

**理由**：
- 不需要自管 Qdrant container，降低 docker-compose 複雜度
- CF 帳號免費額度足夠 MVP 使用
- 單一 vendor 整合，API 介面一致

**替代方案**：pgvector（已在 codebase 有 stub）→ 需要啟用 Postgres extension，搜尋效能不如專門的 vector DB；Qdrant（原架構）→ 需要額外 container 和維運。

**Vectorize 隔離方式**：Single index + user_id filter（payload metadata），不做 index-per-user。每個 vector point 帶：
```
{
  user_id, document_id, source_type: "chunk"|"highlight",
  page, chunk_index, content
}
```
查詢時強制 filter `user_id == current_user.id`。

---

### 2. ARQ + Redis 取代 FastAPI BackgroundTasks

**決定**：document ingestion 和 highlight embed 共用同一個 ARQ Worker，透過 Redis enqueue。

**理由**：
- BackgroundTasks 綁在 uvicorn process，重啟任務消失、無法 retry、無法獨立 scale
- ARQ 是 pure-async Python，與現有 async FastAPI codebase 無縫整合
- Highlight embed 任務輕量（單一 chunk），幾秒內完成，不需要獨立 Worker

**Retry 策略**：最多 3 次，exponential backoff；失敗後 ingestion_status 設為 `failed`，highlight embed_status 設為 `failed`。

**任務類型**：
- `ingest_document(document_id)` → parse → chunk → embed → Vectorize upsert → status: completed
- `embed_highlight(highlight_id)` → embed text → Vectorize upsert → embed_status: done

---

### 3. Per-user 隔離在 Application Layer

**決定**：tenant_id 不做，改為 documents.user_id FK，service layer 統一注入 current_user.id。

**理由**：
- 無需組織層，個人知識庫不需要多人共享文件
- 比 Row-Level Security 設定簡單，async SQLAlchemy 相容性好
- 風險：service 漏掉 filter → 資料洩漏；防護：所有 document / highlight query 都通過 service 層，router 不直接下 query

---

### 4. document.status 欄位拆分

**決定**：`status`（unread / reading / done）保留代表閱讀進度；新增 `ingestion_status`（pending / processing / completed / failed）代表 pipeline 狀態。

**理由**：兩個狀態語意完全不同，合併會造成前端邏輯混亂。

---

### 5. Auth：JWT + bcrypt，不用第三方 OAuth

**決定**：email + password，JWT（HS256），refresh token 不做（MVP）。

**理由**：最簡單，無外部依賴；面向開發者用戶，email 登入足夠。

---

### 6. daily_query_limit 計算方式

**決定**：每日 UTC 00:00 reset，計數從 query_logs WHERE created_at >= today 的 count。

**理由**：query_logs 已經要存，直接 count 不需要額外 counter 欄位；UTC 標準化避免時區問題。

## Risks / Trade-offs

- **CF Vectorize API 延遲**：CF API call 在 Worker 非同步處理，不影響 upload UX；但 query 時 embed + search 都需要呼叫 CF，p99 latency 未知。→ Mitigation：query timeout 設 10s，回傳 503 而非無限等待。

- **CF Vectorize filter 效能**：單一 index 所有 user 的 vectors，filter by user_id 在資料量大時效能待驗證。→ Mitigation：MVP 階段每 user 文件有上限（預設 10 份），總量可控。

- **Application-layer isolation 風險**：開發者忘記帶 user_id filter。→ Mitigation：建立 `get_user_documents(db, user_id)` 等 service function，router 一律呼叫 service 而非直接 query。

- **ARQ Worker 與 FastAPI 共用 DB session**：Worker 需要獨立的 AsyncSessionLocal，不能重用 FastAPI 的 get_db dependency。→ 已在現有 ingestion_service.py 有正確做法（AsyncSessionLocal as context manager）。

## Migration Plan

1. Alembic migration：新增 `users` 和 `query_logs` 表；`documents` 加 `user_id`（nullable 先，再補 NOT NULL）；`highlights` 加 `embed_status`
2. 現有文件（無 user_id）暫時保留 nullable，不自動指派給任何 user（未登入狀態的舊資料）
3. docker-compose 新增 Redis container 和 worker service
4. Cloudflare Vectorize index 建立（手動，透過 CF dashboard 或 wrangler CLI）
5. 環境變數新增：`CF_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CF_VECTORIZE_INDEX_NAME`, `SECRET_KEY`（JWT）

## Open Questions

- CF Vectorize 的 index dimension 要設多少？取決於選用的 CF Workers AI embedding model（`@cf/baai/bge-small-en-v1.5` = 384 dim；`@cf/baai/bge-large-en-v1.5` = 1024 dim）→ 建議先用 small（384）節省配額。
- Admin 的第一個帳號如何建立？→ seed script 或環境變數指定初始 admin email。
