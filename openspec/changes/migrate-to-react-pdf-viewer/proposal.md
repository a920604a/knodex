## Why

Knodex 目前使用 `react-pdf`（低層級，需手動管理每頁），缺乏縮放、全文搜尋、目錄等標準 PDF 閱讀功能。參考 a920604a-labs ebook-reader 的做法，遷移至 `@react-pdf-viewer`（Plugin 架構），開箱即用補足缺少的功能，同時保留 Knodex 既有的畫線系統與自訂閱讀模式。

## What Changes

- **移除** `react-pdf`，改用 `@react-pdf-viewer/core` + 各 plugin 套件，pdfjs-dist 從 v4 降至 v3.11.174
- **新增縮放**：Toolbar 加入 ZoomIn / ZoomOut / CurrentScale（來自 zoom plugin）
- **新增 PDF 全文搜尋**：Toolbar 加入搜尋按鈕（search plugin），與現有「搜尋畫線」分開
- **連續頁模式**：改用 scroll-mode plugin 的 `ScrollMode.Vertical`，取代自建 IntersectionObserver 邏輯
- **保留畫線系統**：`onMouseUp` + `window.getSelection()` 繼續可用（@react-pdf-viewer 的 text layer 同樣渲染可選文字）
- **保留沉浸模式**：CSS fixed overlay 方式不變，與 plugin 無衝突
- **保留進度同步**：改用 `<Viewer onPageChange>` callback

## Capabilities

### New Capabilities

- `pdf-zoom`: PDF 縮放控制（ZoomIn / ZoomOut / 重設至 100%）
- `pdf-text-search`: PDF 全文搜尋（搜尋 PDF 原始文字內容，非畫線）

### Modified Capabilities

（無現有 spec，不需 delta）

## Impact

- `frontend/src/pages/ReaderPage.tsx`：完整重寫，`<Document>/<Page>` → `<Worker>/<Viewer>` + plugins
- `frontend/package.json`：移除 `react-pdf`，新增 6 個 `@react-pdf-viewer` 套件 + `pdfjs-dist@3.11.174`
- `frontend/src/styles/tokens.css`：新增 @react-pdf-viewer CSS override（覆蓋預設 viewer 背景/padding）
- 不影響後端 API
