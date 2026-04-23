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
| PDF 渲染 | react-pdf（PDF.js） | 支援文字層，可取得 offset |
| 後端 | FastAPI（Python 3.12） | 原生 async，Pydantic 驗證 |
| 套件管理 | uv + pyproject.toml | 快速、可重現的依賴管理 |
| ORM | SQLAlchemy 2.0（async） | 與 asyncpg 完整整合 |
| 資料庫 | PostgreSQL 16 | pgvector 相容，全文搜尋 |
| Migration | Alembic（async） | Schema 版本管理 |
| 物件儲存 | MinIO via boto3 | S3 相容，自架，PDF 二進位儲存 |
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
│   │   ├── config.py            # pydantic-settings（DATABASE_URL, MinIO 連線設定）
│   │   ├── database.py          # async engine, session factory, Base
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── document.py      # Document
│   │   │   ├── highlight.py     # Highlight
│   │   │   ├── tag.py           # Tag, HighlightTag
│   │   │   └── chunk.py         # DocumentChunk, Embedding（placeholder）
│   │   ├── schemas/             # Pydantic request / response schemas
│   │   ├── routers/             # FastAPI routers（一個 router 對應一個資源）
│   │   │   ├── documents.py
│   │   │   ├── highlights.py
│   │   │   ├── tags.py
│   │   │   └── search.py
│   │   └── services/            # 業務邏輯層（routers 只做路由，邏輯在 service）
│   │       ├── document_service.py
│   │       ├── highlight_service.py
│   │       ├── tag_service.py
│   │       ├── ingestion_service.py
│   │       ├── storage.py       # MinIO 操作封裝（upload/download/delete/list）
│   │       └── sync_service.py  # 啟動時 MinIO → DB 同步
│   ├── alembic/                 # Migration 設定與版本檔
│   ├── tests/                   # pytest + httpx async 測試
│   └── pyproject.toml           # 依賴定義（uv 管理）
├── frontend/
│   └── src/
│       ├── api/                 # axios 封裝（documents, highlights, tags, search）
│       ├── types/               # TypeScript 型別定義
│       ├── pages/               # 頁面元件（DocumentListPage, ReaderPage, SearchPage）
│       └── components/          # 共用元件（HighlightSidebar, HighlightModal, TagManager）
├── .env.example                 # 環境變數範本
├── docker-compose.yml
├── Makefile
└── docs/
```

---

## 資料模型

```
documents
  id UUID PK
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

### Documents
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/documents` | 上傳 PDF（multipart） |
| `GET` | `/documents` | 列出所有文件 |
| `GET` | `/documents/{id}` | 取得單一文件 |
| `GET` | `/documents/{id}/file` | 取得 PDF 二進位（供前端渲染） |
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

## Startup Sync（MinIO → DB）

後端啟動時以背景 task 執行，不阻塞 HTTP server：

```
lifespan()
 ├─ storage.ensure_bucket()          ← 確保 bucket 存在
 └─ asyncio.create_task(
        sync_minio_to_db()           ← 非阻塞背景同步
    )

sync_minio_to_db()
 ├─ list_objects()                   ← 取 MinIO 全部 key
 ├─ SELECT file_path FROM documents  ← 取 DB 已知 key
 ├─ diff = minio_keys - db_paths     ← set 差集
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
