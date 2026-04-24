## Why

書庫頁面使用 720px 固定寬度與垂直清單設計，在現代寬螢幕上浪費大量空間，100 本書的規模下清單 UX 也難以瀏覽；加上封面僅為首字母佔位，視覺識別度低。現在用戶數與書目量開始增長，是重新設計書庫的時機。

## What Changes

- **移除全站 `max-width: 720px` 限制**，改為響應式全寬 layout，各頁面自行控制內容寬度
- **TopicRail（左側垂直分類）→ TopicBar（橫向 filter pills）**，釋放水平空間
- **書目從垂直清單 → 響應式 Grid**，利用寬螢幕空間，100 本書可一覽無遺
- **PDF 縮圖生成**：ingestion 時以 PyMuPDF 擷取第一頁，存入 MinIO，作為書封面
- **BookCard 視覺重設計**：封面為主、書名 + 進度條為輔，hover 顯示操作按鈕
- **響應式斷點**：1200px+ 顯示 5 欄，900px 顯示 4 欄，600px 顯示 3 欄，< 600px 顯示 2 欄

## Capabilities

### New Capabilities
- `document-thumbnail`: 上傳/ingestion 時自動生成 PDF 第一頁縮圖，存入 MinIO，提供 presigned URL API
- `library-grid-view`: 書庫以響應式封面 Grid 呈現書目，橫向 filter bar 過濾標籤，取代現有垂直清單

### Modified Capabilities
- `document-management`: Document 新增 `thumb_path` 欄位，API 新增 `GET /{id}/thumb-url` endpoint

## Impact

**後端：**
- `documents` table 新增 `thumb_path` nullable TEXT 欄位（Alembic migration）
- `storage.py` 新增 `upload_thumbnail()`、`presign_thumb_url()`
- `ingestion_service.py` 新增縮圖生成步驟（PyMuPDF → JPEG → MinIO）
- `routers/documents.py` 新增 `GET /{id}/thumb-url`

**前端：**
- `tokens.css` 移除 `.page-content { max-width: 720px }`，新增響應式 grid CSS
- `TopicRail.tsx` → `TopicBar.tsx`（橫向 pills）
- `BookCard.tsx` → `LibraryCard.tsx`（封面 grid card）
- `DocumentListPage.tsx` layout 重構
- `HeroShelf.tsx` 封面改用縮圖（附 fallback）

**無 breaking change**：縮圖 `thumb_path` nullable，舊書目顯示 fallback 封面；其餘 API 均為新增。
