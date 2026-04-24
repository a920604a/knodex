# Architecture

## 運行模式

Knodex 前端透過 build-time feature toggle 支援兩種模式，由 `VITE_APP_MODE` 環境變數在 build 時決定：

```
src/lib/mode.ts
  export const isReaderMode = import.meta.env.VITE_APP_MODE === "reader"
```

| | Full mode（預設） | Reader mode（`VITE_APP_MODE=reader`） |
|---|---|---|
| 部署 | Docker Compose 自架 | GitHub Pages（純靜態） |
| 後端依賴 | 需要 FastAPI + DB + MinIO | 無 |
| 認證 | Firebase Google Sign-In | 無 |
| PDF 儲存 | MinIO（雲端） | `URL.createObjectURL`（本機 session） |
| 進度同步 | POST `/documents/{id}/progress` | localStorage |
| 畫線 / 標籤 / RAG | 支援 | 不支援（UI 隱藏） |
| Build 指令 | `npm run build` | `npm run build -- --mode github-pages` |
| Config 檔 | `.env` | `frontend/.env.github-pages` |

Reader mode 的 PDF bytes **從不離開使用者的瀏覽器**；頁面重整後 blob URL 失效，書庫 metadata 仍保留在 localStorage，但需重新選取 PDF 檔案。

---

## 系統概覽（Full mode）

Knodex 是一個自架 PDF 知識管理系統，附 RAG 問答能力。使用者上傳 PDF 後，ARQ worker 在背景非同步解析、分塊、嵌入向量；使用者可在瀏覽器中閱讀、建立畫線、加標籤，並以自然語言向知識庫提問。

```
瀏覽器（React）
    ↕ HTTP / REST
FastAPI 後端
    ↕ asyncpg          ↕ boto3 (S3)      ↕ arq (Redis)
PostgreSQL          MinIO（物件儲存）   ARQ Worker
                                            ↕ httpx
                                        Cloudflare
                                        (Vectorize + Workers AI)
```

**MinIO 是唯一的 PDF / 縮圖真實來源。** 後端啟動時會自動將 MinIO 上的 PDF 同步進 DB（見 Startup Sync）。

---

## 技術選型

| 層級 | 技術 | 理由 |
|------|------|------|
| 前端 | React 18 + TypeScript + Vite | 型別安全、熱更新快 |
| PDF 渲染 | @react-pdf-viewer（PDF.js） | 支援文字層、Range requests |
| 後端 | FastAPI（Python 3.12） | 原生 async，Pydantic 驗證 |
| 套件管理 | uv + pyproject.toml | 快速、可重現的依賴管理 |
| ORM | SQLAlchemy 2.0（async） | 與 asyncpg 完整整合 |
| 資料庫 | PostgreSQL 16 | 穩定、支援複雜查詢 |
| Migration | Alembic（async） | Schema 版本管理，啟動自動執行 |
| Job Queue | ARQ（Redis-backed） | 非同步 worker，支援重試、逾時 |
| 物件儲存 | MinIO via boto3 | S3 相容，自架，PDF / 縮圖二進位儲存 |
| 認證 | Firebase Google Sign-In + JWT | 無密碼，Google 身份驗證 |
| PDF 解析 | PyMuPDF（fitz） | 速度快，可取得文字 + 像素資料 |
| 分塊 | tiktoken（cl100k_base） | Token 數與 LLM context 直接對應 |
| Embedding | Cloudflare Workers AI（@cf/baai/bge-small-en-v1.5） | 384 維，低延遲，按需計費 |
| LLM | Cloudflare Workers AI（@cf/meta/llama-3.1-8b-instruct） | RAG 答案生成 |
| 向量儲存 | Cloudflare Vectorize | 管理向量索引，支援 metadata 過濾 |
| 容器化 | Docker Compose | 單指令啟動所有服務 |

---

## 目錄結構

```
Knodex/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口；lifespan：migration、ARQ pool、ensure_default_tags、sync
│   │   ├── config.py            # pydantic-settings（DB、MinIO、Redis、Cloudflare、Firebase）
│   │   ├── database.py          # async engine, session factory, Base
│   │   ├── dependencies/
│   │   │   └── auth.py          # get_current_user、require_admin
│   │   ├── models/
│   │   │   ├── user.py          # User（firebase_uid, role, pdf_limit, daily_query_limit）
│   │   │   ├── document.py      # Document（ingestion_status, thumb_path）
│   │   │   ├── document_tag.py  # DocumentTag + DocumentTagLink（書目分類標籤）
│   │   │   ├── highlight.py     # Highlight（embed_status）
│   │   │   ├── tag.py           # Tag + HighlightTag（知識標籤，掛載於畫線）
│   │   │   ├── chunk.py         # DocumentChunk
│   │   │   └── query_log.py     # QueryLog（每日用量追蹤）
│   │   ├── schemas/             # Pydantic request / response schemas
│   │   ├── routers/
│   │   │   ├── auth.py          # POST /auth/firebase
│   │   │   ├── documents.py     # CRUD + progress + tags + thumb-url
│   │   │   ├── document_tags.py # /document-tags CRUD
│   │   │   ├── highlights.py    # CRUD + tags
│   │   │   ├── tags.py          # /tags 知識標籤 CRUD（樹狀）
│   │   │   ├── search.py        # GET /search
│   │   │   ├── query.py         # POST /query（RAG）
│   │   │   └── admin.py         # /admin/users, /admin/stats
│   │   └── services/
│   │       ├── firebase.py      # Firebase Admin SDK 單例
│   │       ├── storage.py       # MinIO 操作（upload / presign / thumb / delete）
│   │       ├── sync_service.py  # 啟動時 MinIO → DB 單向同步
│   │       ├── document_service.py
│   │       ├── document_tag_service.py
│   │       ├── highlight_service.py
│   │       ├── tag_service.py
│   │       ├── ingestion_service.py  # 文字擷取 + 分塊（被 worker 呼叫）
│   │       ├── cf_ai.py         # Cloudflare Workers AI（embed / generate）
│   │       └── cf_vectorize.py  # Cloudflare Vectorize（upsert / query / delete）
│   ├── worker/
│   │   ├── main.py              # ARQ WorkerSettings（functions, max_jobs=10, timeout=300s, max_tries=3）
│   │   └── tasks.py             # ingest_document、embed_highlight
│   ├── scripts/
│   │   └── bootstrap_user.py   # 首次部署初始化（設 admin、孤兒文件歸入使用者）
│   ├── alembic/                 # Migration 設定與版本檔
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── api/                 # documents, documentTags, highlights, tags, search
│       ├── contexts/            # AuthContext, ThemeContext
│       ├── lib/                 # firebase.ts, api.ts, concurrency.ts
│       ├── types/               # TypeScript 型別
│       ├── styles/              # tokens.css（設計系統 CSS variables）
│       ├── pages/               # DocumentListPage, ReaderPage, QueryPage, SearchPage,
│       │                        # AuthPage, AdminPage
│       └── components/          # HeroShelf, LibraryCard, TopicBar, TopicDropdown,
│                                # FolderUploadProgress, HighlightSidebar, HighlightModal,
│                                # Sidebar, TagManager, BookCard, DocumentTopicManager
├── .env.example
├── docker-compose.yml
├── Makefile
└── docs/
```

---

## 資料模型

```
users
  id UUID PK
  email TEXT UNIQUE
  firebase_uid VARCHAR UNIQUE
  role TEXT                       ← 'user' | 'admin'
  pdf_limit INT                   ← 預設 10
  daily_query_limit INT           ← 預設 20
  created_at TIMESTAMP

documents
  id UUID PK
  user_id UUID FK → users.id      ← nullable（MinIO sync 孤兒文件）
  title TEXT
  file_path TEXT                  ← MinIO object key（{uuid}_{原始檔名}）
  thumb_path TEXT                 ← MinIO object key（{doc_id}_thumb.jpg），nullable
  status TEXT                     ← unread | reading | done
  ingestion_status TEXT           ← pending | processing | completed | failed
  progress FLOAT                  ← 0.0 ~ 1.0
  total_pages INT
  created_at, updated_at TIMESTAMP

document_tags                     ← 書目分類標籤（書庫橫向篩選用）
  id UUID PK
  name TEXT
  parent_id UUID FK → document_tags.id  ← 自我參照，支援階層

document_tag_links                ← 書目 ↔ 書目標籤  多對多
  document_id UUID FK → documents.id
  tag_id UUID FK → document_tags.id
  PRIMARY KEY (document_id, tag_id)

highlights
  id UUID PK
  document_id UUID FK → documents.id
  text TEXT
  note TEXT
  page INT
  start_offset INT
  end_offset INT
  embed_status TEXT               ← pending | done | failed（Vectorize 嵌入狀態）
  created_at TIMESTAMP

tags                              ← 知識標籤（掛載於畫線，用於 RAG 語意分類）
  id UUID PK
  name TEXT
  parent_id UUID FK → tags.id     ← 自我參照

highlight_tags                    ← 畫線 ↔ 知識標籤  多對多
  highlight_id UUID FK → highlights.id
  tag_id UUID FK → tags.id
  PRIMARY KEY (highlight_id, tag_id)

document_chunks
  id UUID PK
  document_id UUID FK → documents.id
  content TEXT
  chunk_index INT
  page INT

query_logs
  id UUID PK
  user_id UUID FK → users.id
  query_text TEXT
  response_summary TEXT
  tokens_used INT
  created_at TIMESTAMP
```

> **兩套標籤系統：**
> - `document_tags`：書目分類（書庫篩選），不進向量索引
> - `tags`（知識標籤）：掛載於畫線，畫線嵌入向量時 metadata 帶入標籤資訊，供 RAG 使用

---

## API 端點總覽

### Auth
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/auth/firebase` | Firebase ID Token 換取自簽 JWT（upsert User） |

### Documents
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/documents` | 上傳 PDF（multipart），先查重複再上傳 MinIO，enqueue ingestion |
| `GET` | `/documents` | 列出文件（支援 `?document_tag_id` 過濾） |
| `GET` | `/documents/{id}` | 取得單一文件 |
| `GET` | `/documents/{id}/file-url` | presigned URL（PDF，1 小時有效） |
| `GET` | `/documents/{id}/thumb-url` | presigned URL（縮圖 JPEG，1 小時有效） |
| `POST` | `/documents/{id}/progress` | 更新閱讀進度與狀態 |
| `POST` | `/documents/{id}/reprocess` | 重新觸發 ingestion |
| `POST` | `/documents/{id}/tags` | 掛載書目標籤 |
| `DELETE` | `/documents/{id}/tags/{tag_id}` | 移除書目標籤 |
| `DELETE` | `/documents/{id}` | 刪除文件（MinIO PDF + 縮圖 + DB cascade） |

### Document Tags（書目分類標籤）
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/document-tags` | 建立書目標籤（支援 `parent_id`） |
| `GET` | `/document-tags` | 扁平列表 |
| `GET` | `/document-tags/tree` | 巢狀樹狀結構 |
| `DELETE` | `/document-tags/{id}` | 刪除（`?cascade=true` 遞迴刪子節點） |

### Highlights
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/highlights` | 建立畫線，enqueue embed_highlight |
| `GET` | `/highlights` | 列出（支援 `?document_id` `?q` `?tag` `?tag_id`） |
| `GET` | `/highlights/{id}` | 取得單一畫線（含 tags） |
| `PATCH` | `/highlights/{id}` | 更新筆記 |
| `DELETE` | `/highlights/{id}` | 刪除畫線 |
| `POST` | `/highlights/{id}/tags` | 掛載知識標籤 |
| `DELETE` | `/highlights/{id}/tags/{tag_id}` | 移除知識標籤 |

### Tags（知識標籤）
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/tags` | 建立知識標籤（支援 `parent_id`） |
| `GET` | `/tags` | 扁平列表 |
| `GET` | `/tags/tree` | 巢狀樹狀結構 |
| `DELETE` | `/tags/{id}` | 刪除（`?cascade=true` 遞迴刪子節點） |

### Search
| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/search?q=` | 搜尋文件標題 + 畫線文字/筆記 |

### Query（RAG）
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/query` | 自然語言問答，回傳 answer + sources（受 daily_query_limit 限制） |

### Admin
| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/admin/users` | 列出所有使用者及統計 |
| `PATCH` | `/admin/users/{id}` | 修改 pdf_limit / daily_query_limit |
| `GET` | `/admin/stats` | 系統統計（用戶數、文件數、今日查詢數、worker queue 深度） |

---

## Startup Sequence

```
lifespan()
 ├─ run_migrations()              ← alembic upgrade head
 ├─ storage.ensure_bucket()       ← 確保 MinIO bucket 存在
 ├─ ensure_default_tags()         ← 建立預設書目標籤（冪等）
 ├─ asyncio.create_task(
 │      sync_minio_to_db()        ← 非阻塞背景同步（MinIO → DB）
 │  )
 └─ arq_pool = create_pool(...)   ← 建立 Redis ARQ 連線池
```

HTTP server 在全部完成後才開始接受請求（sync 在背景繼續執行）。

### sync_minio_to_db

```
sync_minio_to_db()
 ├─ list_objects()                ← 取 MinIO 全部 .pdf key（pagination）
 ├─ SELECT file_path FROM documents
 ├─ diff = minio_keys - db_paths
 └─ INSERT Document per new key  ← 補建缺少的 DB 記錄
```

單向（MinIO → DB）。MinIO 是真實來源。

---

## Ingestion Pipeline

PDF 上傳後，API 呼叫 `arq_pool.enqueue_job("ingest_document", doc_id)`，Worker 依序執行：

```
[API] 先查 DB 是否有 (user_id, title) 重複 → 409 若重複
       → 上傳至 MinIO（key = {uuid}_{原始檔名}）
       → INSERT documents（ingestion_status=pending）
       → enqueue_job("ingest_document", doc_id)

[Worker: ingest_document]
 ├─ Phase 1: Download PDF from MinIO
 ├─ Phase 2: Thumbnail
 │    └─ PyMuPDF 第一頁 → JPEG（0.37x scale）
 │       → upload_thumbnail → UPDATE documents.thumb_path（立即 commit）
 ├─ Phase 3: Text Extraction
 │    └─ fitz.open() → 逐頁 get_text() → clean_text()
 │       若無文字層（掃描版）→ 記錄 warning，跳至 Finalize
 ├─ Phase 4: Chunking
 │    └─ tiktoken.encode → chunk(size=500, overlap=100)
 │       → DELETE 舊 document_chunks（冪等）
 │       → INSERT document_chunks
 ├─ Phase 5: Embedding（每個 chunk，批次 upsert 20 個）
 │    └─ cf_ai.embed(content)  ← @cf/baai/bge-small-en-v1.5，384 dims
 │       → cf_vectorize.upsert([{id, values, metadata}])
 │          metadata: { user_id, document_id, source_type="chunk", page, chunk_index, content[:500] }
 └─ Finalize: UPDATE documents.total_pages, ingestion_status="completed"

[Worker: embed_highlight]（畫線建立後 enqueue）
 └─ cf_ai.embed(highlight.text)
    → cf_vectorize.upsert([{id="highlight-{id}", values, metadata}])
    → UPDATE highlights.embed_status = "done"
```

---

## RAG 查詢流程

```
POST /query { query: "..." }
 ├─ 檢查 daily_query_limit（QueryLog 今日筆數）
 ├─ cf_ai.embed(query)           ← 同一個 embed model
 ├─ cf_vectorize.query(
 │      vector, filter={"user_id": {"$eq": user_id}}, top_k=5
 │  )
 ├─ 組合 context（chunks + highlights 的 content 片段）
 ├─ cf_ai.generate(prompt)       ← @cf/meta/llama-3.1-8b-instruct
 ├─ INSERT query_logs
 └─ 回傳 { answer, sources: [{type, document_id, page, content}] }
```

向量索引以 `user_id` 隔離，不同使用者的內容互不可見。

---

## MinIO 儲存規則

| 類型 | Key 格式 | 說明 |
|------|----------|------|
| PDF | `{uuid4}_{原始檔名}` | 每次上傳獨立 key，不去重 |
| 縮圖 | `{doc_id}_thumb.jpg` | Ingestion 時生成，與 Document 1:1 |

重複偵測以 `(user_id, title)` 為唯一性，在 MinIO 上傳前就在 DB 層檢查，不產生孤兒檔案。

---

## GitHub Pages 部署（Reader mode）

```
.github/workflows/deploy.yml
 ├─ trigger: push to main（frontend/** 變更）或 workflow_dispatch
 ├─ npm ci
 ├─ npm run build -- --mode github-pages
 │    → 讀取 frontend/.env.github-pages
 │    → VITE_APP_MODE=reader → isReaderMode = true
 │    → VITE_BASE_PATH=/{repo-name}/（由 workflow 動態帶入）
 ├─ cp dist/index.html dist/404.html   ← SPA fallback（GitHub Pages 不支援 server routing）
 └─ actions/deploy-pages → https://<user>.github.io/{repo-name}/
```

Reader mode build 完全不包含後端 API 呼叫、Firebase 初始化，是純靜態 SPA。

---

## 對外 Port 對照（Full mode）

| 服務 | 對外 Port | 容器內 Port |
|------|-----------|------------|
| PostgreSQL | 15432 | 5432 |
| Redis | 16379 | 6379 |
| FastAPI | 18000 | 8000 |
| Nginx（生產） | 18080 | 80 |
| Vite（開發） | 5173 | 5173 |
| MinIO | 外部自架 | — |
