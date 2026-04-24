## 背景

`tokens.css` 已定義 `.btn`、`.input`、`.card`、`.sidebar` 等 CSS class，但有兩個層次的問題：

1. **Class 定義本身偏弱**：button/input 高度靠 padding 撐開（約 28px），border 顏色 `rgba(0,0,0,0.12)` 幾乎不可見，hover 只降 opacity，focus 只改 border 顏色。
2. **套用不一致**：`QueryPage`、`AuthPage`、`BookCard` 等頁面仍使用大量 inline style，繞過了 token 系統。

參考標準：shadcn/ui、Linear、Vercel dashboard 的元件規格（button/input 高度 36px、2px focus ring）。

## 目標 / 非目標

**目標：**
- `tokens.css` 的元件 class 對齊業界標準（36px 高度、清楚 border、focus ring）
- 所有頁面統一使用 CSS class，消除 inline style
- Sidebar 加入 SVG icon，accent 色正確出現在 active state

**非目標：**
- 不引入 Tailwind、shadcn/ui 或任何新 CSS framework
- 不改變 layout 結構（app-shell 三欄維持不變）
- 不修改 tokens（色彩 / 字型 / 間距 token 值不動）
- 不改動 PDF 閱讀器樣式

## 技術決策

### D1：高度用 `min-height` 還是固定 `height`

**選擇：`min-height: 36px`**

固定 `height` 會讓多行文字按鈕溢出。`min-height` 在一般單行使用時視覺等同固定高度，但不會 clip 多行內容。

### D2：Focus ring 實作方式

**選擇：`outline` 而非 `box-shadow`**

```css
.btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

`outline` 不佔 box model 空間、對螢幕閱讀器更友善、不與 `box-shadow` 衝突。只在 `:focus-visible`（鍵盤操作）觸發，滑鼠點擊不顯示。

### D3：Button hover 改為背景加深，不用 opacity

**選擇：`filter: brightness(0.92)`**

`opacity` 降低會讓文字和背景一起淡掉，視覺回饋弱。`brightness(0.92)` 只讓背景加深，文字維持清晰，一行 CSS 通吃所有 variant。

### D4：Sidebar icon 來源

**選擇：inline SVG（hardcode 在 `Sidebar.tsx`）**

無需額外 icon library 依賴。使用 Heroicons / Phosphor 風格的 16px stroke icon，5 個 nav item 各一個。

### D5：消除 inline style 的策略

逐頁處理，新增必要的 utility class（`.page-header`、`.search-bar`、`.query-form` 等）到 `tokens.css`，避免為了消除 inline style 而把 CSS 分散到各 component 檔案。

## 風險 / 取捨

- **`min-height` 在某些 flex 容器可能失效** → 搭配 `display: inline-flex; align-items: center` 確保垂直置中
- **`filter: brightness()` 在舊瀏覽器支援度** → 現代瀏覽器全支援，此專案不需支援舊版
- **改動 `.btn` 可能影響未預期的地方** → 全域搜尋所有 `className="btn` 使用點，逐一確認

## 部署計畫

純前端 CSS + TSX 修改，無需 migration 或部署特殊步驟。修改後重啟 frontend-dev 容器即可看到效果。
