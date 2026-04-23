## Why

目前閱讀器每次只顯示單頁，需要手動點擊翻頁，閱讀流程被打斷；且工具列與側邊欄始終佔據空間，無法專注於內文。增加沉浸式閱讀模式與連續頁捲動，提升長篇閱讀的流暢度。

## What Changes

- 新增「連續頁模式」：一次渲染所有頁面於可捲動容器，滾輪捲動即可翻頁，自動依可見頁面更新進度
- 新增「沉浸式閱讀模式」：隱藏 Toolbar 與 HighlightSidebar，PDF 撐滿視窗；游標靜止時自動淡出控制列，移動時顯示
- 新增頁面模式切換按鈕（單頁 ↔ 連續頁）與沉浸模式開關（鍵盤快捷鍵 `F` 或按鈕）
- 連續頁模式下以 IntersectionObserver 追蹤目前可見頁面，同步 `currentPage` 與進度

## Capabilities

### New Capabilities

- `continuous-page-scroll`: 連續頁捲動模式——所有頁面垂直堆疊於單一捲動容器，滾動自動更新當前頁與閱讀進度
- `immersive-reading-mode`: 沉浸式閱讀模式——隱藏所有 UI chrome，全螢幕專注閱讀，游標移動時暫時顯示控制列

### Modified Capabilities

（無現有 spec）

## Impact

- `frontend/src/pages/ReaderPage.tsx`：主要改動，新增模式狀態與切換邏輯
- `frontend/src/styles/tokens.css`：新增 `.reader--immersive`、`.reader--continuous` 相關 CSS class
- 不影響後端 API
