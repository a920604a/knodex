## 1. 後端：DB Migration & Storage

- [x] 1.1 新增 Alembic migration `0007_document_thumb_path`：在 `documents` table 新增 `thumb_path` nullable TEXT 欄位
- [x] 1.2 更新 `Document` SQLAlchemy model：加入 `thumb_path: Mapped[str | None]`
- [x] 1.3 更新 `DocumentResponse` Pydantic schema：加入 `thumb_path: str | None`
- [x] 1.4 `storage.py` 新增 `upload_thumbnail(key: str, data: bytes) -> None`
- [x] 1.5 `storage.py` 新增 `presign_thumb_url(key: str, expires: int = 3600) -> str`
- [x] 1.6 `storage.py` 新增 `delete_thumbnail(key: str) -> None`（key 存在才刪）

## 2. 後端：Ingestion 縮圖生成

- [x] 2.1 `ingestion_service.py` 新增 `generate_thumbnail(pdf_bytes: bytes, doc_id: uuid.UUID) -> str | None`：PyMuPDF 渲染第一頁 → JPEG bytes → 上傳 MinIO → 回傳 object key；失敗回傳 None 並 log warning
- [x] 2.2 在 `ingest_document()` 主流程的 `fitz.open()` 之後呼叫 `generate_thumbnail()`，成功時 `UPDATE documents SET thumb_path = key`
- [x] 2.3 確認 `reprocess` endpoint 走同一 ingestion 路徑，縮圖自動重新生成

## 3. 後端：縮圖 API & 刪除

- [x] 3.1 `routers/documents.py` 新增 `GET /{doc_id}/thumb-url`：檢查 `thumb_path`，NULL 時回傳 404，否則回傳 `{ "url": presigned }`
- [x] 3.2 `DELETE /{doc_id}` handler：刪除 MinIO PDF 後，若 `thumb_path` 非 NULL 也呼叫 `storage.delete_thumbnail()`

## 4. 前端：全站寬度修正

- [x] 4.1 `tokens.css` 的 `.page-content` 移除 `max-width: 720px` 與 `margin: 0 auto`，改為 `padding: var(--space-lg) var(--space-xl)`
- [x] 4.2 新增 `.page-content--prose { max-width: 720px; margin: 0 auto; }`（供未來文章頁使用）

## 5. 前端：TopicBar 元件

- [x] 5.1 新增 `src/components/TopicBar.tsx`：橫向 pills，props 與 TopicRail 相同（tags, countByTagId, untaggedCount, selectedTagId, onSelect）
- [x] 5.2 `tokens.css` 新增 `.topic-bar`（flex, gap, overflow-x: auto, scrollbar hidden）、`.topic-bar__pill`（pill 樣式）、`.topic-bar__pill--active`（accent 色）
- [x] 5.3 `DocumentListPage.tsx` 將 `<TopicRail>` 替換為 `<TopicBar>`，從 `library-page` flex layout 中移除左側欄

## 6. 前端：LibraryCard 元件

- [x] 6.1 新增 `src/components/LibraryCard.tsx`：接受 `doc: Document`、`thumbUrl: string | null`、`allTags`、`isBusy`、`onToggleTag`、`onDelete`、`onClick`
- [x] 6.2 封面區域：有 `thumbUrl` 時顯示 `<img>`，無時顯示首字母漸層色塊（複用 `titleToHue` 邏輯）；`img` 加 `onError` fallback
- [x] 6.3 `tokens.css` 新增 `.library-grid`（`display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-md)`）
- [x] 6.4 `tokens.css` 新增 `.library-card`、`.library-card__cover`（aspect-ratio 3/4, object-fit cover）、`.library-card__title`（2 行 clamp）、`.library-card__progress`
- [x] 6.5 hover 狀態：`.library-card:hover .library-card__actions` 顯示刪除 + TopicDropdown trigger（opacity transition）
- [x] 6.6 `tokens.css` 補充響應式：`@media (max-width: 600px) { .library-grid { gap: var(--space-sm); } }`（欄數由 auto-fill 自動處理，不需額外斷點）

## 7. 前端：縮圖 URL 整合

- [x] 7.1 `src/api/documents.ts` 新增 `getDocumentThumbUrl(id: string): Promise<string>`
- [x] 7.2 `DocumentListPage.tsx` 載入後批次 fetch 所有 thumb-url（`Promise.allSettled`），存入 `thumbUrls: Map<string, string>` state
- [x] 7.3 `HeroShelf.tsx` 接受 `thumbUrls?: Map<string, string>` prop，有縮圖時替換首字母色塊，`onError` fallback

## 8. 前端：DocumentListPage 整合

- [x] 8.1 `DocumentListPage.tsx` 的 `library-page` 從 `flex` 改為單欄（移除 TopicRail 後無需雙欄）
- [x] 8.2 將 `<ul className="doc-list">` + `<BookCard>` 替換為 `<div className="library-grid">` + `<LibraryCard>`
- [x] 8.3 傳入 `thumbUrls` 給 `<HeroShelf>` 與 `<LibraryCard>`

## 9. 驗收

- [ ] 9.1 上傳 PDF → ingestion 完成 → `thumb_path` 非 NULL，MinIO 有 `*_thumb.jpg`
- [ ] 9.2 書庫 Grid：1440px 螢幕顯示 5+ 欄，600px 以下顯示 2 欄
- [ ] 9.3 舊書目（thumb_path NULL）顯示首字母 fallback cover，不報錯
- [ ] 9.4 TopicBar filter 正確過濾書目，標籤過多時可橫向捲動
- [ ] 9.5 LibraryCard hover 顯示刪除與標籤按鈕，點擊 card 導航至 Reader
- [ ] 9.6 QueryPage、TagManager 頁面寬度比之前明顯增加（目視確認）
- [x] 9.7 TypeScript 型別檢查通過（`npx tsc --noEmit`）
