## Why

目前前端所有頁面使用 inline style，無統一設計語言，視覺粗糙、維護困難。套用 Apple Human Interface Guidelines（HIG）可讓 Knodex 在桌面瀏覽器上擁有接近 macOS app 的質感，同時建立可擴充的 design token 系統。

## What Changes

- **新增** `src/styles/tokens.css`：全域 CSS 變數（色彩、字型、間距、圓角、陰影），支援 Light / Dark Mode
- **BREAKING** 移除 `index.css` 與 `App.css` 中所有 Vite scaffold 樣式，替換為 HIG-based reset
- **BREAKING** 所有頁面與元件的 inline style 全部移除，改用 CSS class + token
- **新增** 三欄式 layout shell：左側毛玻璃 sidebar（220px）+ 主內容（flex-1）+ 右側 Inspector panel（300px，Reader 模式才展開）
- **修改** 導覽從頂部 `<Nav>` bar 移至左側 sidebar，含 icon + label
- **修改** 所有互動元件（Button、Input、Modal、Card）跟隨 HIG 規範的外觀

## Capabilities

### New Capabilities

- `design-tokens`：CSS 變數系統，定義 HIG 色彩（紫色 accent `#BF5AF2`、label colors、背景層次）、字型（SF Pro stack）、間距、圓角、陰影、blur
- `app-shell`：三欄式 layout，左側毛玻璃 sidebar 導覽、主內容區、右側 Inspector panel
- `dark-mode`：透過 `prefers-color-scheme` 自動切換，所有 token 均有 dark variant
- `hig-components`：Button、Input、Card、Modal、Tag chip、Sidebar nav item 的 HIG 樣式

### Modified Capabilities

_(無 spec-level 行為變更，僅視覺層改動)_

## Impact

- 影響所有前端檔案：`App.tsx`、`index.css`、`App.css`、全部 pages / components
- 不影響後端 API、資料模型、型別定義（`types/index.ts`）
- 不引入新 npm 依賴（純 CSS + 現有 React）
- `react-pdf` 的 PDF 渲染區域維持不變，僅調整外框樣式
