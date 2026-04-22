# Knodex

自架 PDF 知識管理系統。將閱讀過程中的畫線轉化為可搜尋的結構化知識庫，並預留 RAG（檢索增強生成）擴充空間。

```
PDF → 閱讀 → 畫線 → 標籤 → 搜尋 → (未來) RAG
```

---

## 功能

- **PDF 上傳與閱讀**：支援最大 100MB，瀏覽器內逐頁渲染，自動記錄閱讀進度
- **畫線知識單元**：選取文字即可建立畫線，附加筆記與頁碼位置
- **階層式標籤**：支援父子標籤結構，可掛載多個標籤至畫線
- **全文搜尋**：跨文件搜尋標題與畫線文字/筆記，支援標籤篩選
- **RAG-ready**：PDF 自動分塊（500 tokens, overlap 100）存入 `document_chunks`，預留 pgvector 欄位

---

## 快速啟動

**需要：** Docker、Docker Compose

```bash
# 1. 啟動所有服務
make up

# 2. 執行資料庫 migration
make migrate

# 3. 開啟瀏覽器
open http://localhost:5173
```

服務位址：

| 服務 | 位址 |
|------|------|
| 前端 | http://localhost:5173 |
| API | http://localhost:18000 |
| API 文件 | http://localhost:18000/docs |
| PostgreSQL | localhost:15432 |

---

## 本地開發（不用 Docker）

**需要：** Python 3.12、Node.js 20、PostgreSQL

```bash
# 安裝依賴
make install

# 啟動 PostgreSQL 後執行 migration
make migrate

# 分兩個終端啟動
make dev-backend    # → http://localhost:18000
make dev-frontend   # → http://localhost:15173
```

`.env` 設定（`backend/.env`）：

```env
DATABASE_URL=postgresql+asyncpg://knodex:knodex@localhost:15432/knodex
PDF_STORAGE_ROOT=./pdfdata
```

---

## 常用指令

```bash
make up          # Docker 啟動全部服務
make up-d        # 背景啟動
make down        # 停止服務
make down-v      # 停止並清除 volume（重置 DB）
make migrate     # 執行 DB migration
make migrate-down # 回滾一個 migration
make test        # 執行後端測試
make lint        # TypeScript 型別檢查
make clean-db    # 清除本地 pgdata / pdfdata
```

---

## 技術架構

| 層 | 技術 |
|----|------|
| 前端 | React 18 + TypeScript + Vite |
| PDF 渲染 | react-pdf（PDF.js） |
| 後端 | FastAPI + Python 3.12 |
| 資料庫 | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0（async） |
| PDF 解析 | PyMuPDF（fitz） |
| 分塊 | tiktoken cl100k_base |

詳細架構說明見 [docs/architecture.md](docs/architecture.md)。

---

## 專案結構

```
Knodex/
├── backend/         # FastAPI 後端
│   ├── app/
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routers/     # API 路由
│   │   ├── services/    # 業務邏輯
│   │   └── schemas/     # Pydantic schemas
│   ├── alembic/     # DB migration
│   └── tests/       # 測試
├── frontend/        # React 前端
│   └── src/
│       ├── api/         # API 呼叫封裝
│       ├── pages/       # 頁面元件
│       └── components/  # 共用元件
├── docs/            # 技術文件
├── docker-compose.yml
└── Makefile
```

---

## 文件

- [架構說明](docs/architecture.md) — 系統設計、資料模型、API 總覽、Ingestion Pipeline
- [使用者流程](docs/user-flow.md) — 各功能完整操作流程

---

## 未來規劃（RAG）

1. 啟用 pgvector：`CREATE EXTENSION IF NOT EXISTS vector;`
2. 將 `embeddings.vector` 欄位改為 `Vector(1536)`
3. 新增 embedding worker（chunks → 向量）
4. 新增 RAG query service（問題 → 向量搜尋 → LLM）
