## 背景

前端目前無設計系統，全部使用 inline style。視覺與 Apple HIG 相差甚遠：無統一字型 stack、顏色隨意、間距不一致、無 dark mode、無毛玻璃效果。本次改動範圍限於前端視覺層，不動後端 API 與資料邏輯。

## 目標 / 非目標

**目標：**
- 建立全域 CSS token 系統（HIG 色彩、字型、間距）
- 三欄式 layout shell，左側毛玻璃 sidebar
- Light / Dark Mode 自動切換
- 所有互動元件視覺跟隨 HIG 規範
- 不引入新 npm 依賴

**非目標：**
- 動畫 / 頁面轉場
- 響應式 / 手機版
- 完整 component library（只做現有用到的元件）
- 無障礙（ARIA）強化

## 決策

### 決策 1：Design Token 用 CSS Custom Properties（CSS 變數）

**選擇**：`tokens.css` 定義所有 `:root` 變數，`@media (prefers-color-scheme: dark)` 覆蓋 dark variant。

**理由**：零依賴，瀏覽器原生支援，與 React 完全解耦，未來可換主題只需改 token 檔。

---

### 決策 2：Layout 用 CSS Grid（三欄）

```
grid-template-columns: 220px 1fr 0px  /* 預設：Inspector 收起 */
grid-template-columns: 220px 1fr 300px /* Reader：Inspector 展開 */
```

**理由**：Grid 比 Flexbox 更適合多欄等高 layout，transition 可用 `grid-template-columns` 做平滑展開。

---

### 決策 3：毛玻璃 Sidebar 用 `backdrop-filter: blur(20px)`

**選擇**：sidebar 背景 `rgba(255,255,255,0.72)`（light）/ `rgba(30,30,30,0.72)`（dark）+ `backdrop-filter: blur(20px) saturate(180%)`。

**理由**：精確對應 macOS sidebar 材質（`NSVisualEffectView` 的 `.sidebar` material）。

---

### 決策 4：色彩系統對應 Apple System Colors

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `--color-accent` | `#BF5AF2` | `#BF5AF2` | 按鈕、選中、連結 |
| `--color-label` | `#1d1d1f` | `#f5f5f7` | 主文字 |
| `--color-secondary-label` | `#6e6e73` | `#aeaeb2` | 次要文字 |
| `--color-tertiary-label` | `#aeaeb2` | `#6e6e73` | 佔位 / disabled |
| `--color-bg` | `#f5f5f7` | `#1c1c1e` | 頁面背景 |
| `--color-surface` | `#ffffff` | `#2c2c2e` | Card / Panel 背景 |
| `--color-surface-2` | `#f2f2f7` | `#3a3a3c` | 次級 surface |
| `--color-separator` | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.12)` | 分隔線 |
| `--color-fill` | `rgba(120,120,128,0.12)` | `rgba(120,120,128,0.24)` | Input 背景 |

---

### 決策 5：字型 Stack 使用 SF Pro（系統字型）

```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
```

字體大小遵循 HIG Text Styles：
- Large Title：28px / 700
- Title：20px / 600
- Body：15px / 400（基準）
- Callout：13px / 400
- Caption：11px / 400

---

### 決策 6：圓角、間距、陰影

| Token | 值 |
|-------|-----|
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 14px |
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.1)` |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.12)` |

---

### 決策 7：元件改寫策略

**不建立新元件**，直接替換現有元件的 inline style 為 CSS class。每個元件 import `tokens.css`（已在 `main.tsx` global import，不需重複）。

元件 class 命名用 BEM-lite：`.card`、`.card__title`、`.btn`、`.btn--primary`、`.sidebar__item`、`.sidebar__item--active`。

## 風險 / 取捨

| 風險 | 緩解 |
|------|------|
| `backdrop-filter` 在部分舊版 Chrome 有效能問題 | 加 `@supports (backdrop-filter: blur())` fallback 為純色 |
| 移除 inline style 可能遺漏某些動態樣式 | 逐元件改寫，動態部分（如 progress bar 寬度）保留 inline `style` |
| Grid `transition` 在 Safari 有 bug | 用 `max-width` transition 替代 grid column transition |
