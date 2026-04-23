## 1. 套件遷移

- [x] 1.1 `npm uninstall react-pdf` + 安裝 `@react-pdf-viewer/core@3.12.0`、`page-navigation`、`scroll-mode`、`zoom`、`search`、`pdfjs-dist@3.11.174`

## 2. ReaderPage 核心重寫

- [x] 2.1 移除 `react-pdf` imports（`Document`、`Page`、`pdfjs`），改用 `@react-pdf-viewer/core` 的 `Worker`、`Viewer`
- [x] 2.2 import plugin CSS：`@react-pdf-viewer/core/lib/styles/index.css`、`zoom`、`search`、`page-navigation` 樣式
- [x] 2.3 初始化 plugins：`pageNavigationPlugin`、`scrollModePlugin`、`zoomPlugin`、`searchPlugin`
- [x] 2.4 `<Viewer>` 的 `onPageChange` callback：`e.currentPage + 1`（0→1 indexed）更新 `currentPage` 並 `syncProgress`
- [x] 2.5 `<Viewer>` 的 `onDocumentLoad` callback：取得 `numberOfPages`，更新 `numPages`
- [x] 2.6 移除 `pageRefs` + IntersectionObserver 邏輯，連續頁改用 `scrollModePlugin.switchScrollMode(ScrollMode.Vertical | ScrollMode.Page)`
- [x] 2.7 `isContinuous` 切換時呼叫 `switchScrollMode`（需在 `useEffect` 中）

## 3. Toolbar 補充功能

- [x] 3.1 Toolbar 加入 `<ZoomOut />`、`<CurrentScale />`、`<ZoomIn />`（來自 zoomPlugin）
- [x] 3.2 Toolbar 加入 `<ShowSearchPopover />`（來自 searchPlugin）
- [x] 3.3 連續頁切換按鈕改為呼叫 `switchScrollMode` 而非自建 state
- [x] 3.4 沉浸模式浮動控制列的翻頁按鈕改用 `jumpToPage`（來自 pageNavigationPlugin，0-indexed）

## 4. 畫線系統保留

- [x] 4.1 viewer 外層 div 加 `onMouseUp={handleTextSelection}`，確認 `window.getSelection()` 可正常取得選取文字
- [x] 4.2 `handleTextSelection` 中的 `page: currentPage` 仍正確（currentPage 由 `onPageChange` 維護）
- [x] 4.3 HighlightSidebar、HighlightModal 無需改動，確認正常運作

## 5. CSS 整合

- [x] 5.1 `tokens.css` 新增 `.rpv-core__viewer` override：背景透明、去除預設 padding
- [x] 5.2 確認 @react-pdf-viewer 的 text layer CSS 不與現有 reader 樣式衝突
- [x] 5.3 確認 search plugin 的高亮色與 Knodex accent color 協調

## 6. 驗證

- [ ] 6.1 PDF 正常載入、頁面渲染正確
- [ ] 6.2 單頁模式翻頁、連續頁捲動均正常
- [ ] 6.3 ZoomIn / ZoomOut / CurrentScale 功能正常
- [ ] 6.4 PDF 全文搜尋可高亮關鍵字
- [ ] 6.5 文字選取 → HighlightModal 出現 → 儲存成功
- [ ] 6.6 沉浸模式（F）、浮動控制列正常
- [ ] 6.7 進度 debounce 正確同步後端
