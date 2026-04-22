## 背景

這是一個全新的自架系統，目標是讓開發者在本地或 NAS 環境中，將 PDF 閱讀過程中產生的畫線（highlight）轉化為可搜尋的結構化知識庫。系統無前置依賴、無現有程式碼需遷移，從零開始建構。

核心限制：
- 單一使用者，不需要帳號系統
- PDF 檔案必須存於本地或 NAS 路徑，不使用雲端儲存
- PDF 解析不得阻塞 API 回應
- 資料庫 Schema 須與 pgvector 相容，為未來 RAG 預留空間

## 目標 / 非目標

**目標：**
- 可上傳、閱讀 PDF，並追蹤閱讀進度
- 從選取文字建立畫線知識單元，附帶位置資訊與筆記
- 支援階層式標籤，可掛載至畫線
- 全文搜尋文件標題與畫線內容，支援標籤篩選
- 非同步 PDF 文字擷取與分塊，存入 `document_chunks`（RAG-ready）

**非目標：**
- 多使用者、帳號管理、權限控制
- AI 生成內容（摘要、自動標籤）
- 向量搜尋（pgvector 整合留待未來）
- TTS、推薦系統

## 技術決策

### 決策 1：後端框架選用 FastAPI

**選擇**：FastAPI（Python）

**理由**：
- 原生支援 async，符合「PDF 處理不阻塞 API」的限制
- 型別提示 + Pydantic 可直接從 Schema 生成驗證邏輯
- 與 PyMuPDF（PDF 解析）、SQLAlchemy（ORM）生態相容

**備選**：Django REST Framework — 功能完整但同步優先，引入 async 需額外配置；Node.js/Express — 生態對 PDF 解析支援較弱。

---

### 決策 2：PDF 解析使用 PyMuPDF（fitz）

**選擇**：PyMuPDF

**理由**：
- 解析速度快，記憶體效率高
- 支援文字座標擷取（未來可用於畫線位置對齊）
- Python 原生，無需 JVM 或外部進程

**備選**：pdfminer.six — 純 Python 但速度慢；pdfplumber — 基於 pdfminer，適合表格但非純文字場景。

---

### 決策 3：背景任務使用 FastAPI BackgroundTasks（MVP），未來可升級 Celery

**選擇**：`BackgroundTasks`（FastAPI 內建）

**理由**：
- MVP 階段單一使用者，並發需求低，內建機制足夠
- 零外部依賴（不需要 Redis / RabbitMQ）
- 介面設計成 service function，未來抽換 Celery worker 時只需替換呼叫層

**備選**：Celery + Redis — 可靠性高、支援重試，但 MVP 導入成本過高。

---

### 決策 4：前端 PDF 渲染使用 react-pdf

**選擇**：react-pdf（基於 PDF.js）

**理由**：
- React 生態最成熟的 PDF 渲染方案
- 支援逐頁渲染，可取得文字層座標（用於畫線 offset 計算）
- 維護活躍，TypeScript 支援良好

**備選**：直接嵌入 `<iframe>` + 瀏覽器原生 PDF — 無法控制文字選取與 offset 擷取。

---

### 決策 5：資料庫使用 PostgreSQL，Schema 預留 pgvector 欄位

**選擇**：PostgreSQL + SQLAlchemy（async）

**理由**：
- `document_chunks` 與 `embeddings` 表可直接在同一 DB 中透過 `CREATE EXTENSION vector` 啟用向量搜尋
- 全文搜尋可用 `tsvector` + GIN index，不需引入 Elasticsearch
- 單一資料庫降低 MVP 運維複雜度

**備選**：SQLite — 輕量但不支援 pgvector，未來遷移成本高；MongoDB — 文件模型對關聯查詢（highlight ↔ tag）不友善。

---

### 決策 6：分塊策略採固定 token 數（500 tokens，overlap 100）

**選擇**：token-based chunking，使用 tiktoken

**理由**：
- Token 數與 LLM context window 直接對應，embedding 模型輸入限制以 token 計
- Overlap 確保跨塊語意不斷裂
- 策略簡單，結果可預期，MVP 階段不需語意分塊

**備選**：語意分塊（sentence-transformers）— 品質更高但計算成本高，留待 RAG 階段。

## 風險 / 取捨

| 風險 | 緩解策略 |
|------|---------|
| FastAPI BackgroundTasks 在進程重啟時會遺失佇列中的任務 | 記錄 ingestion 狀態於 `documents` 表（`status` 欄位），重啟後可補跑失敗任務 |
| PDF 文字擷取品質因掃描版 PDF 而降低 | MVP 不支援 OCR；在文件中說明限制，未來可加入 Tesseract |
| react-pdf 文字層 offset 計算與後端儲存的 offset 不一致 | 前後端統一使用「UTF-16 code unit offset within page text」，在 API 文件中明確定義 |
| PostgreSQL 全文搜尋對中文效果差（預設分詞不支援中文） | MVP 使用 `ILIKE` 模糊搜尋；未來可安裝 `pg_jieba` 或改用 `zhparser` |
| NAS 路徑在容器化部署時需掛載 volume | `file_path` 存相對路徑，根目錄由環境變數 `PDF_STORAGE_ROOT` 控制 |

## 遷移計畫

這是全新系統，無資料遷移需求。部署順序：

1. 建立 PostgreSQL DB，執行 Schema migration（Alembic）
2. 啟動 FastAPI 後端
3. 啟動前端 React dev server（或 build 靜態檔案）
4. 驗證上傳 → 解析 → 畫線 → 搜尋流程

回滾：直接停止服務，無下游系統影響。

## 已確認決策

- **offset 定義**：`start_offset` / `end_offset` 為**頁面內字元位置**（page-level character offset），簡化實作
- **PDF 大小限制**：最大 100MB，後端 FastAPI 與 Nginx（若有）均需設定此限制
- **中文搜尋**：MVP 使用 `ILIKE` 模糊搜尋，可接受
- **前端**：無需 PWA / 離線支援
