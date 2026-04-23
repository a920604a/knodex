## Why

Knodex 已有 PDF 閱讀、highlight、tag 等功能，但知識無法被查詢——使用者讀完的文件沉在 library 裡無法再利用。市面上的 RAG 工具（ChatPDF、NotebookLM）只搜尋文件原文，忽略了使用者的閱讀行為；Knodex 已有 highlight 系統，可以把「使用者認為重要的段落」也納入向量搜尋，讓系統回答「你理解了什麼」而不只是「文件寫了什麼」。

## What Changes

- **新增 Auth 系統**：使用者註冊 / 登入（JWT），role 分 admin / user
- **新增 Per-user 文件隔離**：每個 user 只看得到自己的文件，有 PDF 數量上限
- **升級 Ingestion Pipeline**：從 FastAPI BackgroundTasks 換成 Redis Queue + ARQ Worker，新增 CF Workers AI embedding + CF Vectorize upsert
- **新增 Highlight Async Embed**：highlight 建立後近即時 enqueue，Worker 幾秒內 embed 並寫入 Vectorize（與 document ingestion 共用同一個 Worker）
- **新增 RAG Query API**：`POST /query`，搜尋使用者自己的 chunks + highlights，透過 CF Workers AI LLM 生成答案，sources 區分來源類型
- **新增 Admin Dashboard API**：查看所有 user 的使用狀況，可調整每個 user 的 PDF 上限和每日 query 次數上限
- **前端調整**：新增 Login / Register 頁、Query 介面、Admin dashboard 頁

## Capabilities

### New Capabilities

- `user-auth`: 使用者註冊、登入、JWT 驗證、role-based 存取控制（admin / user）
- `per-user-document-isolation`: 文件與 user 綁定，list / upload / delete 強制隔離，PDF 數量上限檢查
- `async-ingestion-worker`: Redis Queue + ARQ Worker，處理 document_ingest 和 highlight_embed 兩種任務，含 retry 機制
- `highlight-async-embed`: highlight 建立 / 更新時 enqueue，Worker 近即時 embed 並寫入 CF Vectorize，source_type 標記為 highlight
- `rag-query`: POST /query 端點，embed query → CF Vectorize 搜尋（filter by user_id）→ LLM 生成答案，每日次數限額，記錄 query_logs
- `admin-dashboard`: Admin-only API，查看 user 列表與使用統計，調整 per-user 的 pdf_limit 和 daily_query_limit，系統總覽

### Modified Capabilities

- `ingestion-pipeline`: 原有 parse → chunk 邏輯保留，新增 embed（CF Workers AI）→ Vectorize upsert 步驟；document 新增 ingestion_status 欄位（pending / processing / completed / failed），與既有閱讀狀態欄位分開
- `document-management`: documents 表新增 user_id FK，所有 API 強制 per-user 隔離

## Impact

**Backend**
- 新增 `users`, `query_logs` 表；`documents` 加 `user_id`, `ingestion_status`；`highlights` 加 `embed_status`
- 新增 `/auth`, `/query`, `/admin` router
- `documents.py` router 全面加 `current_user` dependency
- 新增獨立 Worker process（`backend/worker/`）

**Infrastructure**
- `docker-compose.yml` 新增 Redis container 和 worker service
- 新增 Cloudflare Workers AI + Vectorize API 整合（HTTP client）
- 移除對 Qdrant 的依賴（原本就沒加，直接用 CF Vectorize）

**Frontend**
- 新增 Login / Register 頁面
- 新增 Query 介面（含 sources 顯示，區分 highlight vs chunk）
- 新增 Admin dashboard 頁面（user 列表 + 編輯 limits）
