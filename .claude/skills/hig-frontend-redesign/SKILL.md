---
name: hig-frontend-redesign
description: Use when redesigning a web app's visual layer with Apple HIG inspiration while keeping existing brand identity — CSS token system, app shell, sidebar, dark mode, component refactor from inline styles to classes.
---

# HIG 前端重設計

## 概述

將 Apple Human Interface Guidelines 的**結構模式**（間距、Layout、毛玻璃、Dark Mode）套用至 React/Vite 專案，**同時保留專案原有品牌色與識別**。不引入新 npm 依賴，純 CSS + 現有 React。

## 適用情境

- 現有 UI 全用 inline style，無設計系統
- 需要 macOS 風格的 Sidebar + 主內容 Layout
- 需要基於 token 的 Dark Mode
- 要把 inline style 替換為可重用 CSS class
- **不適用**：引入 component library（Radix、shadcn、MUI）時

## 核心原則：品牌 vs 結構 分開處理

**從 HIG 採用：**
- Layout 結構（App Shell、Sidebar、Inspector）
- 間距 / 圓角 / 陰影數值
- 字型 stack（`-apple-system, BlinkMacSystemFont, ...`）
- Dark Mode 切換模式

**從品牌保留：**
- Accent 色（`--color-accent`）— 維持專案既有顏色
- 品牌專屬字型（若有）

---

## Step 1 — Design Token 檔

建立 `src/styles/tokens.css`，在 `main.tsx` global import（不在各元件重複 import）。

```css
:root {
  /* 品牌 Accent — 保留專案既有顏色 */
  --color-accent: #BF5AF2;  /* ← 替換為實際品牌色 */

  /* HIG 結構色 */
  --color-label: #1d1d1f;
  --color-secondary-label: #6e6e73;
  --color-bg: #f5f5f7;
  --color-surface: #ffffff;
  --color-surface-2: #f2f2f7;
  --color-separator: rgba(0, 0, 0, 0.12);
  --color-fill: rgba(120, 120, 128, 0.12);

  /* 間距 — HIG 4px grid */
  --space-xs: 4px;  --space-sm: 8px;
  --space-md: 16px; --space-lg: 24px; --space-xl: 32px;

  /* 圓角 */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;

  /* 陰影 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.12);

  /* 字型 */
  --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
  --font-size-title: 20px;  --font-size-body: 15px;
  --font-size-callout: 13px; --font-size-caption: 11px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-label: #f5f5f7;
    --color-secondary-label: #aeaeb2;
    --color-bg: #1c1c1e;
    --color-surface: #2c2c2e;
    --color-surface-2: #3a3a3c;
    --color-separator: rgba(255,255,255,0.12);
    --color-fill: rgba(120,120,128,0.24);
  }
}
```

**清空** `index.css` 與 `App.css`，替換為 HIG reset：
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { font-family: var(--font-sans); font-size: var(--font-size-body);
       color: var(--color-label); background: var(--color-bg);
       -webkit-font-smoothing: antialiased; }
```

---

## Step 2 — App Shell（兩欄 Grid）

在 `App.tsx` 把頂部 Nav 換成 `Sidebar` 元件，外層加 grid wrapper：

```css
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100dvh;
  overflow: hidden;
}
.app-content { overflow-y: auto; min-height: 0; }
```

**Sidebar 毛玻璃** — 必須提供純色 fallback：
```css
.sidebar { background: var(--color-surface); }  /* 無 backdrop-filter 時的 fallback */
@supports (backdrop-filter: blur(1px)) {
  .sidebar {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(20px) saturate(180%);
  }
}
@media (prefers-color-scheme: dark) {
  .sidebar { background: var(--color-surface); }
  @supports (backdrop-filter: blur(1px)) {
    .sidebar { background: rgba(30,30,30,0.72); }
  }
}
```

**Sidebar active 狀態** — 在 Sidebar 元件用 `useLocation()`：
```tsx
const { pathname } = useLocation();
<a className={`sidebar__item ${pathname === "/" ? "sidebar__item--active" : ""}`}>
```

```css
.sidebar__item--active { background: rgba(191,90,242,0.12); color: var(--color-accent); }
.sidebar__item:hover   { background: var(--color-fill); color: var(--color-label); }
```

---

## Step 3 — 元件 CSS Class

定義在 `tokens.css`，BEM-lite 命名。

| Class | 用途 |
|-------|------|
| `.btn` `.btn--primary` `.btn--danger` | 所有按鈕 |
| `.input` `.input:focus` | 所有文字輸入 |
| `.card` `.card--clickable` | 列表項目、面板 |
| `.modal-overlay` `.modal` | 對話框 |
| `.tag-chip` `.tag-chip--selected` | 標籤標籤 |
| `.highlight-card` | 左側 accent border 的知識卡片 |
| `.separator` | `<hr>` 分隔線 |

---

## Step 4 — 頁面 Inline Style 移除規則

靜態樣式移至 CSS class；**動態值保留 inline style**：

```tsx
// ❌ 移除：靜態樣式值 → 移至 CSS class
<li style={{ padding: "12px 16px", border: "1px solid #e0e0e0", cursor: "pointer" }}>

// ✅ 保留：真正動態的值維持 inline
<div style={{ width: `${progress * 100}%` }} />
```

清除 `index.css` 舊有 scaffold 變數（`--text`、`--bg` 等），全數改用 HIG token 名稱。

---

## Step 5 — Inspector Panel（閱讀器側邊欄）

右側詳細面板的 layout 在頁面元件內處理，**不放在 App Shell**（避免 state lifting）：

```css
.reader-layout { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.reader-body   { display: flex; flex: 1; overflow: hidden; }
.reader-pdf    { flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; }
.reader-inspector { width: 300px; border-left: 1px solid var(--color-separator);
                    overflow-y: auto; background: var(--color-surface); }
```

---

## 常見錯誤

| 錯誤 | 修正 |
|------|------|
| 把品牌 Accent 換成 HIG 紫色 | 只採用結構；`--color-accent` 維持品牌色 |
| `backdrop-filter` 沒包 `@supports` | 務必加 fallback 純色 |
| 把 HighlightSidebar 移到 App Shell | 與頁面共置，用 flex layout 控制 |
| 各元件各自 import `tokens.css` | 只在 `main.tsx` import 一次，`:root` 變數全域生效 |
| 移除動態 `style={{ width: x }}` | 動態值保留 inline；靜態值才移至 CSS |
| App Grid 用三欄 | 用兩欄即可；除非 Inspector state 已提升至 App 層 |
