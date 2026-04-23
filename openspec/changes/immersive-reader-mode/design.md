## Context

目前 `ReaderPage.tsx` 使用 react-pdf 的 `<Page>` 元件，每次只渲染單一頁面，透過 `currentPage` state 控制顯示哪頁。Toolbar 與 HighlightSidebar 始終可見，佔據固定垂直與水平空間。

## Goals / Non-Goals

**Goals:**
- 連續頁模式：所有頁面垂直排列於同一 scroll container，滾動即翻頁
- 沉浸模式：隱藏 Toolbar 與 HighlightSidebar；游標 idle 3 秒後自動淡出浮動控制列，移動時恢復
- 兩種模式可獨立組合（連續頁 + 沉浸、單頁 + 沉浸）
- 鍵盤快捷鍵：`F` 切換沉浸、`C` 切換連續頁

**Non-Goals:**
- 橫向翻頁動畫
- 雙頁並排模式
- 改動後端 API

## Decisions

### D1：連續頁渲染策略 — 全部預渲染 vs 虛擬捲動

選擇：**全部預渲染**（`Array.from({ length: numPages })`）。  
理由：react-pdf 的 `<Page>` 內建 canvas lazy-render，未進入 viewport 的頁面成本低。虛擬捲動需自行計算頁面高度，在不同 zoom 下難以維護，複雜度過高。  
風險：頁數超過 300 頁的大型文件可能記憶體壓力較高，但 Knodex 以一般技術書籍為主，可接受。

### D2：當前頁追蹤 — IntersectionObserver

每個 `<Page>` 包裝在有 `data-page` 屬性的 `<div>` 內，以 `IntersectionObserver`（threshold: 0.5）觀察。可見面積超過 50% 的頁面即為當前頁，更新 `currentPage` state。

### D3：沉浸模式控制列顯示 — pointer idle timer

以 `useRef` 儲存 setTimeout handle，pointer move 時重置計時器。CSS class `reader--controls-visible` / `reader--controls-hidden` 控制 opacity + pointer-events。

### D4：模式狀態存儲

`useState` 即可；不持久化到 localStorage，每次進入 reader 重置，避免使用者困惑。

## Risks / Trade-offs

- [連續頁大文件效能] → 若未來需要，可加入 `react-window` 虛擬捲動作為 opt-in
- [沉浸模式 touch 設備] → 目前設計以滑鼠為主，touch 設備需額外 tap 邏輯，列為後續改進
- [IntersectionObserver 精準度] → 頁面高度不等時，捲動快速可能短暫顯示錯誤頁碼，屬可接受視覺誤差
