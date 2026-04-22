## 1. 專案初始化與基礎架構

- [x] 1.1 建立 FastAPI 專案結構（`app/`, `app/routers/`, `app/services/`, `app/models/`）
- [x] 1.2 設定 `pyproject.toml` / `requirements.txt`，加入 fastapi、uvicorn、sqlalchemy[asyncio]、asyncpg、alembic、pydantic、python-multipart
- [x] 1.3 設定環境變數設定檔（`PDF_STORAGE_ROOT`、`DATABASE_URL`），使用 pydantic BaseSettings
- [x] 1.4 建立 Docker Compose 設定（PostgreSQL + FastAPI 服務）
- [x] 1.5 初始化 Alembic，設定 async migration 環境

## 2. 資料庫 Schema

- [x] 2.1 建立 `documents` 表 migration（id UUID PK、title、file_path、status、progress、total_pages、created_at、updated_at）
- [x] 2.2 建立 `highlights` 表 migration（id UUID PK、document_id FK、text、note、page、start_offset、end_offset、created_at）
- [x] 2.3 建立 `tags` 表 migration（id UUID PK、name、parent_id UUID FK self-referential nullable）
- [x] 2.4 建立 `highlight_tags` 表 migration（highlight_id + tag_id 複合 PK，並設 unique constraint）
- [x] 2.5 建立 `document_chunks` 表 migration（id UUID、document_id FK、content、chunk_index、page）
- [x] 2.6 建立 `embeddings` 表 schema（id UUID、ref_type、ref_id UUID、vector 欄位留空/TEXT 佔位），加上 TODO 註解說明待 pgvector 啟用

## 3. 文件管理 API

- [x] 3.1 實作 `POST /documents`：接受 multipart PDF 上傳，存檔至 `PDF_STORAGE_ROOT`，建立 DB 記錄，觸發 background ingestion
- [x] 3.2 實作 `GET /documents`：回傳所有文件列表
- [x] 3.3 實作 `GET /documents/{id}`：回傳單一文件，不存在時 404
- [x] 3.4 實作 `POST /documents/{id}/progress`：更新閱讀進度與狀態，驗證 page 不超過 total_pages
- [x] 3.5 實作 `POST /documents/{id}/reprocess`：重新觸發 ingestion pipeline
- [x] 3.6 撰寫文件管理相關單元測試（上傳、列表、進度更新、邊界條件）

## 4. 畫線管理 API

- [x] 4.1 實作 `POST /highlights`：建立畫線，驗證 document_id 存在，回傳 201
- [x] 4.2 實作 `GET /highlights`：列出畫線，支援 `?document_id`、`?q`、`?tag`、`?tag_id` 查詢參數
- [x] 4.3 實作 `GET /highlights/{id}`：回傳畫線含 tags 陣列
- [x] 4.4 實作 `PATCH /highlights/{id}`：更新 note 欄位
- [x] 4.5 實作 `DELETE /highlights/{id}`：刪除畫線及 highlight_tags，回傳 204
- [x] 4.6 實作 `POST /highlights/{id}/tags`：掛載標籤（冪等）
- [x] 4.7 實作 `DELETE /highlights/{id}/tags/{tag_id}`：移除畫線標籤
- [x] 4.8 撰寫畫線管理相關單元測試

## 5. 標籤系統 API

- [x] 5.1 實作 `POST /tags`：建立標籤，驗證 parent_id 存在，同層名稱重複回傳 409
- [x] 5.2 實作 `GET /tags`：回傳扁平標籤列表
- [x] 5.3 實作 `GET /tags/tree`：以遞迴查詢或應用層組裝回傳巢狀樹狀結構
- [x] 5.4 實作 `DELETE /tags/{id}`：支援 `?cascade=true`，否則有子標籤時回傳 409
- [x] 5.5 撰寫標籤系統相關單元測試

## 6. 搜尋 API

- [x] 6.1 實作 `GET /search?q=`：以 `ILIKE` 搜尋 documents.title 與 highlights.text + highlights.note，回傳分類結果
- [x] 6.2 確認 `GET /highlights?tag=` 與 `GET /highlights?tag_id=` 的標籤篩選已在 4.2 中實作
- [x] 6.3 確認 `GET /highlights?q=&tag=` 的組合查詢正確使用 AND 條件
- [x] 6.4 撰寫搜尋相關單元測試（關鍵字、標籤、組合、空結果）

## 7. PDF Ingestion Pipeline

- [x] 7.1 加入 PyMuPDF（fitz）與 tiktoken 至依賴
- [x] 7.2 實作文字擷取 service：逐頁呼叫 fitz，清理文字（strip 多餘空白、控制字元）
- [x] 7.3 實作分塊 service：500 token 視窗、100 token overlap，記錄 chunk_index 與 page 來源
- [x] 7.4 實作冪等寫入：先刪除 document_id 舊 chunks，再批次 insert 新 chunks
- [x] 7.5 實作 BackgroundTasks ingestion handler，上傳後自動呼叫，更新 total_pages
- [x] 7.6 加入錯誤捕捉與 logging（掃描版 PDF 警告、例外紀錄）
- [x] 7.7 撰寫 ingestion pipeline 單元測試（正常分塊、短文件、掃描版、冪等）

## 8. 前端：基礎架構與文件管理

- [x] 8.1 建立 React + TypeScript 專案（Vite），設定 API base URL 環境變數
- [x] 8.2 建立文件列表頁：呼叫 `GET /documents`，顯示標題、狀態、進度
- [x] 8.3 實作 PDF 上傳元件：multipart form，上傳後刷新列表

## 9. 前端：PDF 閱讀器

- [x] 9.1 安裝 react-pdf，建立 PDF 閱讀器頁面，渲染目標文件
- [x] 9.2 實作翻頁控制（上/下頁、直接跳頁輸入框）
- [x] 9.3 實作翻頁後 debounce 2 秒觸發 `POST /documents/{id}/progress` 同步
- [x] 9.4 實作文字選取偵測：選取後顯示「新增畫線」浮動按鈕，帶入 text、page、start_offset、end_offset

## 10. 前端：畫線與標籤 UI

- [x] 10.1 實作新增畫線 modal：顯示選取文字、允許輸入 note、選擇標籤，呼叫 `POST /highlights`
- [x] 10.2 實作畫線列表側欄：顯示目前文件的所有畫線，支援點擊跳至對應頁面
- [x] 10.3 實作畫線筆記編輯（inline 或 modal），呼叫 `PATCH /highlights/{id}`
- [x] 10.4 實作標籤管理 UI：顯示標籤樹（`GET /tags/tree`）、新增標籤（支援選父標籤）
- [x] 10.5 實作畫線標籤掛載/移除 UI

## 11. 前端：搜尋功能

- [x] 11.1 實作全域搜尋欄，呼叫 `GET /search?q=`，顯示文件與畫線分類結果
- [x] 11.2 實作畫線列表標籤篩選下拉選單，呼叫 `GET /highlights?tag=`
- [x] 11.3 支援關鍵字與標籤組合篩選

## 12. 整合測試與驗收

- [ ] 12.1 驗收：上傳 PDF → 自動分塊 → 在閱讀器中開啟
- [ ] 12.2 驗收：選取文字 → 建立畫線 → 加上標籤 → 在畫線列表中可見
- [ ] 12.3 驗收：搜尋關鍵字 → 正確回傳對應文件與畫線
- [ ] 12.4 驗收：標籤樹正確顯示父子階層，刪除父標籤（cascade）後子標籤一併消失
- [ ] 12.5 驗收：進度同步正確，`status` 在最後一頁時自動變為 `done`
