## Context

`react-pdf` v10 + pdfjs-dist v4 → `@react-pdf-viewer` v3.12 + pdfjs-dist v3.11.174。
`@react-pdf-viewer` 採用 Plugin 架構：每個功能（縮放、搜尋、頁面導航、捲動模式）都是獨立 plugin instance，傳入 `<Viewer plugins={[...]}>`。

目前 ReaderPage 用到的功能：
- `<Document>/<Page>`（頁面渲染）
- `IntersectionObserver`（連續頁 currentPage 追蹤）
- `onMouseUp` + `window.getSelection()`（畫線文字選取）
- `syncProgress`（debounce 進度同步）
- `isImmersive` CSS fixed overlay（沉浸模式）
- `FloatingControls`（沉浸時浮動控制列）

## Goals / Non-Goals

**Goals:**
- 用 `@react-pdf-viewer` 替換 `react-pdf` 的頁面渲染
- 透過 plugins 補上縮放、PDF 全文搜尋
- 連續頁改用 scroll-mode plugin（刪除自建 IntersectionObserver）
- 保留畫線系統（text selection + HighlightModal + HighlightSidebar）
- 保留沉浸模式（CSS overlay 方式）

**Non-Goals:**
- 使用 `@react-pdf-viewer/default-layout`（其固定 sidebar/toolbar 難以整合既有設計）
- 使用 `@react-pdf-viewer/highlight` plugin（與 Knodex 自建畫線系統衝突）
- 使用 full-screen plugin（維持自建 CSS immersive 方式）

## Decisions

### D1：不用 default-layout，改用 core + 個別 plugin

理由：`default-layout` 帶有固定的 sidebar（書籤、縮略圖、附件）和 toolbar，難以整合 Knodex 的自訂 `reader-header` 三欄設計與 HighlightSidebar。個別 plugin 提供 component（`ZoomIn`、`ShowSearchPopover`）可直接放入自訂 toolbar。

### D2：連續頁改用 scroll-mode plugin

`scrollModePlugin` 提供 `switchScrollMode(ScrollMode.Vertical | ScrollMode.Page)`，取代我們自建的 `Array.from({ length: numPages })` + IntersectionObserver。`ScrollMode.Page` = 單頁翻頁；`ScrollMode.Vertical` = 連續捲動。

### D3：保留 window.getSelection() 畫線方式

`@react-pdf-viewer` 的 text layer 同樣渲染可選文字（`<span>` elements），`window.getSelection()` 可正常工作。在 viewer 外層 div 加 `onMouseUp` 即可，不需改動 HighlightModal 邏輯。

### D4：頁碼轉換（0-indexed vs 1-indexed）

`@react-pdf-viewer` 所有 API 使用 **0-indexed** 頁碼（`onPageChange({ currentPage: 0 })`），Knodex 後端與 UI 使用 1-indexed。轉換點統一在 `onPageChange` callback：`setCurrentPage(e.currentPage + 1)`。

### D5：Worker URL

使用 local worker（避免 CDN 依賴）：
```tsx
workerUrl={new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href}
```

## Risks / Trade-offs

- [pdfjs-dist 降版 v4→v3] → v3.11.174 為 LTS，功能穩定；Knodex 未使用 v4 特有 API，風險低
- [scroll-mode 與 page-navigation plugin 配合] → 在 `ScrollMode.Page` 下，GoToNextPage/GoToPreviousPage 可正常使用；`ScrollMode.Vertical` 下頁碼由 onPageChange 更新
- [@react-pdf-viewer CSS 與既有 tokens.css 衝突] → @react-pdf-viewer 使用 `rpv-` 前綴 class，命名空間獨立，只需 override viewer container 的背景色與 padding
