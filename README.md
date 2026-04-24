# Knodex

自架 PDF 知識管理系統，附 RAG 問答能力。上傳 PDF、閱讀畫線、加標籤，再用自然語言向知識庫提問。

```
PDF → 閱讀 → 畫線 → 標籤 → RAG 問答
```

Knodex 有兩種運行模式：

| 模式 | 說明 | 部署方式 |
|------|------|---------|
| **Full mode**（完整模式） | 全功能：後端 API、MinIO、RAG 問答、畫線、標籤 | Docker Compose 自架 |
| **Reader mode**（閱讀器模式） | 純前端 PDF 閱讀器，無需後端，PDF 存在本機 | GitHub Pages |

---

## 功能對照

| 功能 | Full mode | Reader mode |
|------|:---------:|:-----------:|
| Google 登入 | ✓ | — |
| PDF 上傳（雲端儲存） | ✓ | — |
| PDF 閱讀（本機） | — | ✓ |
| 閱讀進度同步 | ✓（後端） | ✓（localStorage） |
| 資料夾批次上傳 | ✓ | — |
| PDF 封面縮圖 | ✓ | — |
| 書目分類標籤 | ✓ | — |
| 畫線知識單元 | ✓ | — |
| 知識標籤 | ✓ | — |
| 全文搜尋 | ✓ | — |
| RAG 問答 | ✓ | — |
| 深色模式 | ✓ | ✓ |
| 管理後台 | ✓ | — |

---

## 快速啟動

### Reader mode（GitHub Pages）

不需要任何後端，直接使用 GitHub Pages 免費部署：

1. Fork 這個 repo
2. GitHub → Settings → Pages → Source 選 **GitHub Actions**
3. Push 到 `main` → GitHub Actions 自動 build 並部署

部署完成後可在 `https://<你的帳號>.github.io/Knodex/` 使用純 PDF 閱讀器，PDF 存在瀏覽器本機，頁面重整後需重新選取檔案。

---

### Full mode（自架，完整功能）

**需要：** Docker、Docker Compose、外部 MinIO、Firebase 專案、Cloudflare 帳號

```bash
# 1. 設定環境變數
cp .env.example .env
# 編輯 .env，填入所有必要設定（見下方）

# 2. 放置 Firebase Admin SDK 金鑰（不可 commit）
cp /path/to/your-firebase-adminsdk-xxx.json backend/

# 3. 建置前端 + 啟動所有服務（含 ARQ worker）
make prod

# 4. 首次部署：先用 Google 登入建立帳號，再執行 bootstrap
docker compose exec backend uv run python scripts/bootstrap_user.py <your-email>

# 5. 開啟瀏覽器
open http://localhost:18080
```

> DB migration 在後端啟動時自動執行（`alembic upgrade head`），不需要手動 `make migrate`。

服務位址：

| 服務 | 位址 |
|------|------|
| 應用程式（nginx） | http://localhost:18080 |
| API | http://localhost:18000 |
| API 文件 | http://localhost:18000/docs |
| PostgreSQL | localhost:15432 |

---

## 開發模式（hot reload）

```bash
# 啟動 db + redis + backend
make dev-backend

# 另一個終端啟動 ARQ worker
make dev-worker

# 另一個終端啟動前端 dev server
make dev-frontend

open http://localhost:5173
```

---

## 環境變數

`.env`（根目錄，對應 `docker-compose.yml`）：

```env
# MinIO（PDF / 縮圖 物件儲存）
MINIO_ENDPOINT=http://your-minio-host:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=ebook

# Redis（ARQ job queue）
REDIS_URL=redis://redis:6379

# Firebase Admin（後端驗證 Google ID Token）
FIREBASE_CREDENTIALS_JSON=/app/your-firebase-adminsdk-xxx.json

# Firebase Web（前端 SDK）
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id

# Cloudflare（Embedding + LLM + Vectorize）
CF_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CF_VECTORIZE_INDEX_NAME=knodex-chunks
```

> Firebase Admin SDK 金鑰 JSON 需掛載至後端容器，不可 commit 至 git。

---

## 常用指令

```bash
make prod            # build 前端 → 啟動 db + redis + backend + worker + nginx（:18080）
make dev-backend     # 啟動 db + redis + backend（開發用）
make dev-worker      # 啟動 ARQ worker（開發用）
make dev-frontend    # 啟動前端 dev server（:5173）
make down            # 停止服務
make down-v          # 停止並清除 volume（重置 DB）
make migrate         # 手動執行 DB migration（通常不需要，啟動時自動跑）
make migrate-down    # 回滾一個 migration
make test            # 執行後端測試
make lint            # TypeScript 型別檢查
make clean-db        # 清除本地 pgdata
```

---

## 技術架構

| 層 | 技術 |
|----|------|
| 前端 | React 18 + TypeScript + Vite |
| PDF 渲染 | @react-pdf-viewer（PDF.js） |
| 後端 | FastAPI + Python 3.12 |
| 套件管理 | uv + pyproject.toml |
| 資料庫 | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0（async） |
| Job Queue | ARQ（Redis-backed async worker） |
| 物件儲存 | MinIO（S3 相容）via boto3 |
| 認證 | Firebase Google Sign-In + JWT |
| PDF 解析 | PyMuPDF（fitz） |
| 分塊 | tiktoken cl100k_base |
| Embedding | Cloudflare Workers AI（@cf/baai/bge-small-en-v1.5, 384 dims） |
| LLM | Cloudflare Workers AI（@cf/meta/llama-3.1-8b-instruct） |
| 向量儲存 | Cloudflare Vectorize |

詳細架構說明見 [docs/architecture.md](docs/architecture.md)。

---

## 專案結構

```
Knodex/
├── backend/
│   ├── app/
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routers/     # API 路由
│   │   ├── services/    # 業務邏輯（storage, cf_ai, cf_vectorize, sync...）
│   │   └── schemas/     # Pydantic schemas
│   ├── worker/          # ARQ async worker（ingest_document, embed_highlight）
│   ├── alembic/         # DB migration
│   └── tests/           # 測試
├── frontend/
│   └── src/
│       ├── api/         # API 呼叫封裝
│       ├── pages/       # 頁面元件
│       ├── components/  # 共用元件
│       └── lib/         # 工具（firebase, concurrency）
├── docs/                # 技術文件
├── .env.example         # 環境變數範本
├── docker-compose.yml
└── Makefile
```

---

## 文件

- [架構說明](docs/architecture.md) — 系統設計、資料模型、API 總覽、Ingestion Pipeline
- [使用者流程](docs/user-flow.md) — 各功能完整操作流程
