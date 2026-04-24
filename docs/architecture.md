# Architecture

## 系統概覽

Knodex 是一個自架 PDF 知識管理系統。使用者上傳 PDF 後，系統在背景非同步解析並分塊，使用者可在瀏覽器中閱讀、建立畫線知識單元、加上標籤，並透過全文搜尋查找。

```
瀏覽器（React）
    ↕ HTTP / REST
FastAPI 後端
    ↕ asyncpg          ↕ boto3 (S3)
PostgreSQL          MinIO（物件儲存）
```

**MinIO 是唯一的 PDF 檔案真實來源。** 後端啟動時會自動將 MinIO 上的檔案同步進 DB（見 Startup Sync）。

---

## 技術選型

| 層級 | 技術 | 理由 |
|------|------|------|
| 前端 | React 18 + TypeScript + Vite | 型別安全、熱更新快 |
| PDF 渲染 | @react-pdf-viewer（PDF.js） | 支援文字層、Range requests |
| 後端 | FastAPI（Python 3.12） | 原生 async，Pydantic 驗證 |
| 套件管理 | uv + pyproject.toml | 快速、可重現的依賴管理 |
| ORM | SQLAlchemy 2.0（async） | 與 asyncpg 完整整合 |
| 資料庫 | PostgreSQL 16 | pgvector 相容，全文搜尋 |
| Migration | Alembic（async） | Schema 版本管理 |
| 物件儲存 | MinIO via boto3 | S3 相容，自架，PDF 二進位儲存 |
| 認證 | Firebase Google Sign-In + JWT | 無密碼，Google 身份驗證 |
| PDF 解析 | PyMuPDF（fitz） | 速度快，可取得文字座標 |
| 分塊 | tiktoken（cl100k_base） | Token 數與 LLM context 直接對應 |
| 容器化 | Docker Compose | 單指令啟動所有服務 |

---

## 目錄結構

```
Knodex/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口，lifespan（bucket + startup sync），router 註冊
│   │   ├── config.py            # pydantic-settings（DATABASE_URL, MinIO, Firebase 設定）
│   │   ├── database.py          # async engine, session factory, Base
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py          # User（firebase_uid, role）
│   │   │   ├── document.py      # Document（user_id FK）
│   │   │   ├── highlight.py     # Highlight
│   │   │   ├── tag.py           # Tag, HighlightTag
│   │   │   └── chunk.py         # DocumentChunk, Embedding（placeholder）
│   │   ├── schemas/             # Pydantic request / response schemas
│   │   ├── routers/             # FastAPI routers（一個 router 對應一個資源）
│   │   │   ├── auth.py          # POST /auth/firebase（Token Exchange）
│   │   │   ├── documents.py
│   │   │   ├── highlights.py
│   │   │   ├── tags.py
│   │   │   └── search.py
│   │   └── services/            # 業務邏輯層（routers 只做路由，邏輯在 service）
│   │       ├── firebase.py      # Firebase Admin SDK 單例初始化
│   │       ├── document_service.py
│   │       ├── highlight_service.py
│   │       ├── tag_service.py
│   │       ├── ingestion_service.py
│   │       ├── storage.py       # MinIO 操作（upload/download/stream/presign/exists/delete）
│   │       └── sync_service.py  # 啟動時 MinIO → DB 同步
│   ├── scripts/
│   │   └── bootstrap_user.py   # 首次部署初始化（設 admin、孤兒文件歸入使用者）
│   ├── alembic/                 # Migration 設定與版本檔
│   ├── tests/                   # pytest + httpx async 測試
│   └── pyproject.toml           # 依賴定義（uv 管理）
├── frontend/
│   └── src/
│       ├── api/                 # API 呼叫封裝（documents, highlights, tags, search）
│       ├── contexts/            # React Context（AuthContext, ThemeContext）
│       ├── lib/                 # 工具（firebase.ts SDK 初始化、api.ts apiFetch）
│       ├── types/               # TypeScript 型別定義
│       ├── styles/              # tokens.css（設計系統 CSS variables）
│       ├── pages/               # 頁面元件（AuthPage, LibraryPage, ReaderPage, QueryPage）
│       └── components/          # 共用元件（Sidebar, BookCard, HighlightSidebar, HighlightModal）
├── .env.example                 # 環境變數範本
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
  firebase_uid VARCHAR UNIQUE   ← Firebase Google 登入後寫入
  role TEXT                     ← 'user' | 'admin'（預設 'user'）
  created_at TIMESTAMP

documents
  id UUID PK
  user_id UUID FK → users.id   ← nullable（MinIO sync 進來的孤兒文件）
  title TEXT
  file_path TEXT          ← MinIO object key（格式：{uuid}_{原始檔名}）
  status TEXT             ← unread | reading | done
  progress FLOAT          ← 0.0 ~ 1.0
  total_pages INT
  created_at, updated_at TIMESTAMP

highlights
  id UUID PK
  document_id UUID FK → documents.id
  text TEXT             ← 選取的原文
  note TEXT             ← 使用者筆記（可空）
  page INT              ← 頁碼（1-based）
  start_offset INT      ← 頁面內字元起始位置
  end_offset INT        ← 頁面內字元結束位置
  created_at TIMESTAMP

tags
  id UUID PK
  name TEXT
  parent_id UUID FK → tags.id  ← 自我參照，允許 NULL（根節點）

highlight_tags
  highlight_id UUID FK → highlights.id
  tag_id UUID FK → tags.id
  PRIMARY KEY (highlight_id, tag_id)

document_chunks              ← RAG-ready
  id UUID PK
  document_id UUID FK → documents.id
  content TEXT
  chunk_index INT
  page INT

embeddings                   ← 未來 pgvector 啟用後使用
  id UUID PK
  ref_type TEXT              ← 'chunk' | 'highlight'
  ref_id UUID
  vector TEXT                ← 佔位，待換 Vector(1536)
```

---

## API 端點總覽

### Auth
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/auth/firebase` | Firebase ID Token 換取自簽 JWT（upsert User） |

### Documents
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/documents` | 上傳 PDF（multipart） |
| `GET` | `/documents` | 列出所有文件 |
| `GET` | `/documents/{id}` | 取得單一文件 |
| `GET` | `/documents/{id}/file-url` | 取得 MinIO presigned URL（1 小時有效） |
| `POST` | `/documents/{id}/progress` | 更新閱讀進度與狀態 |
| `POST` | `/documents/{id}/reprocess` | 重新觸發 ingestion |
| `DELETE` | `/documents/{id}` | 刪除文件（同時刪除 MinIO 檔案） |

### Highlights
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/highlights` | 建立畫線 |
| `GET` | `/highlights` | 列出畫線（支援 `?document_id` `?q` `?tag` `?tag_id`） |
| `GET` | `/highlights/{id}` | 取得單一畫線（含 tags） |
| `PATCH` | `/highlights/{id}` | 更新筆記 |
| `DELETE` | `/highlights/{id}` | 刪除畫線 |
| `POST` | `/highlights/{id}/tags` | 掛載標籤 |
| `DELETE` | `/highlights/{id}/tags/{tag_id}` | 移除畫線標籤 |

### Tags
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/tags` | 建立標籤（支援 `parent_id`） |
| `GET` | `/tags` | 扁平列表 |
| `GET` | `/tags/tree` | 巢狀樹狀結構 |
| `DELETE` | `/tags/{id}` | 刪除（`?cascade=true` 遞迴刪子節點） |

### Search
| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/search?q=` | 搜尋文件標題 + 畫線文字/筆記 |

---

## Startup Sequence

後端啟動時依序執行，HTTP server 在全部完成後才開始接受請求（sync 除外）：

```
lifespan()
 ├─ run_migrations()                 ← alembic upgrade head（建表或 no-op）
 ├─ firebase.init_app()              ← Firebase Admin SDK 初始化（驗證 credentials JSON）
 ├─ storage.ensure_bucket()          ← 確保 MinIO bucket 存在
 └─ asyncio.create_task(
        sync_minio_to_db()           ← 非阻塞背景同步
    )
```

Migration 在啟動時自動跑，不需要手動執行 `make migrate`。

### sync_minio_to_db

```
sync_minio_to_db()
 ├─ list_objects()                   ← 取 MinIO 全部 key（支援 pagination）
 ├─ SELECT file_path FROM documents  ← 取 DB 已知 key
 ├─ diff = minio_keys - db_paths     ← Python set 差集
 └─ INSERT Document per new key      ← 補建缺少的 DB 記錄
```

只做單向（MinIO → DB）。MinIO 是真實來源，DB 記錄不會因為 MinIO 缺檔而被刪除。

---

## Ingestion Pipeline

```
PDF Upload
    │
    ▼
[API] 上傳至 MinIO → INSERT documents
    │
    ▼ BackgroundTask（不阻塞 API 回應）
[Worker] 從 MinIO 下載 PDF → fitz.open()
    │
    ├─ 逐頁 get_text() → clean_text()
    │      移除控制字元、合併多餘換行
    │
    ├─ tiktoken.encode(text)
    │
    ├─ chunk(tokens, size=500, overlap=100)
    │
    ├─ DELETE 舊 document_chunks（冪等）
    │
    ├─ INSERT document_chunks
    │
    └─ UPDATE documents.total_pages
```

**掃描版 PDF**：無文字層時記錄 warning log，跳過分塊，不報錯。

---

## 未來擴充（RAG）

```
使用者輸入問題
    ↓
embedding(query) → vector
    ↓
pgvector ANN search → document_chunks
    ↓
top-k chunks → LLM context
    ↓
生成回答
```

啟用步驟：
1. `CREATE EXTENSION IF NOT EXISTS vector;`
2. 將 `embeddings.vector` 欄位改為 `Vector(1536)`
3. 新增 embedding worker（處理 chunks → 向量）
4. 新增 RAG query service

---

## 對外 Port 對照

| 服務 | 對外 Port | 容器內 Port |
|------|-----------|------------|
| PostgreSQL | 15432 | 5432 |
| FastAPI | 18000 | 8000 |
| Nginx（生產） | 18080 | 80 |
| Vite（開發） | 5173 | 5173 |
| MinIO | 外部自架 | — |
