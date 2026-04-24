## 為什麼

Knodex 的 UI 元件（Button、Input、Sidebar nav）雖然有 CSS class 定義，但存在兩個問題：一是各頁面套用不一致（QueryPage、AuthPage 仍使用 inline style）；二是 class 本身定義偏素——高度太扁、border 幾乎不可見、hover/focus 效果薄弱。

參考 Linear、Vercel、Notion、shadcn/ui 等高流量產品工具的設計規範，標準的 button/input 高度為 36–40px、border 有足夠對比度、focus 使用 2px ring 而非只改 border 顏色。對齊這個標準可以讓 Knodex 從「系統預設感」變成「有設計過」的質感。

## 變更內容

- **修改** `tokens.css` 的 `.btn`、`.input`、`.btn--primary`、`.btn--ghost`、`.btn--danger` — 統一高度 36px、改善 hover/focus/border
- **新增** `.btn--sm`（28px）、`.input--lg`（40px）尺寸 variant
- **修改** `.sidebar__item` active/hover state — 加入 accent 色背景，補上 icon 預留空間
- **修改** `Sidebar.tsx` — 每個 nav item 加入對應 icon（SVG inline）
- **修改** `QueryPage.tsx`、`AuthPage.tsx`、`BookCard.tsx`、`ReaderPage.tsx` — 移除 inline style，換成 CSS class
- **修改** `tag-chip` — 改為全圓角（border-radius 999px），更接近現代 tag 風格

## 功能範疇

### 新增功能

- `unified-component-style`：所有互動元件（button、input、tag chip、sidebar nav item）套用統一的視覺規格，參照 shadcn/ui / Linear 設計標準

### 修改現有功能

- `design-tokens`：`.btn` / `.input` / `.sidebar__item` 的尺寸與互動樣式升級

## 影響範圍

- **CSS**：`src/styles/tokens.css`（元件樣式重定義）
- **元件**：`Sidebar.tsx`（加 icon）
- **頁面**：`QueryPage.tsx`、`AuthPage.tsx`、`BookCard.tsx`、`ReaderPage.tsx`（inline style → class）
- **不影響**：後端 API、資料模型、路由、PDF 渲染邏輯
