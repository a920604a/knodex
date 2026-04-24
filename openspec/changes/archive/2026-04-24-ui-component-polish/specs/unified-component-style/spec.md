## 新增需求

### 需求：Button 元件有統一且清楚的視覺規格
所有 `<button>` 元素**必須**套用 `.btn` class。`.btn` class **必須**提供至少 36px 的最小高度、清楚可見的 border、以及鍵盤操作時可見的 focus ring。

#### 情境：Primary button 外觀
- **WHEN** 頁面渲染含 `className="btn btn--primary"` 的按鈕
- **THEN** 按鈕高度不低於 36px，背景為 accent 色，文字為白色

#### 情境：Button hover 有明顯回饋
- **WHEN** 使用者將滑鼠移至任何 `.btn` 按鈕上
- **THEN** 按鈕背景可見地加深，不僅是透明度降低

#### 情境：Button focus ring 在鍵盤操作時出現
- **WHEN** 使用者以 Tab 鍵聚焦至 `.btn` 按鈕
- **THEN** 顯示 2px accent 色 outline，並與按鈕邊緣保持 2px 間距

### 需求：Input 元件與 Button 高度齊平
所有 `<input>` 元素**必須**套用 `.input` class。`.input` **必須**提供與 `.btn` 相同的最小高度（36px），且 border 顏色清楚可見。

#### 情境：Input 與相鄰 button 高度對齊
- **WHEN** `.input` 和 `.btn` 並排排列於同一行（如搜尋列）
- **THEN** 兩者視覺高度相同

#### 情境：Input focus 有明確提示
- **WHEN** 使用者點擊或 Tab 至 `.input` 輸入框
- **THEN** 顯示 accent 色 outline ring，背景變純白

### 需求：Sidebar nav item 有 icon 和 accent active state
Sidebar 導覽項目**必須**在每個 label 前顯示對應的 16px SVG icon，且 active 狀態**必須**以 accent 色背景和文字標示。

#### 情境：Nav item active 狀態
- **WHEN** 目前路由與某個 nav item 的路徑相符
- **THEN** 該 item 顯示淡 accent 色背景，文字為 accent 色

#### 情境：Nav item 包含 icon
- **WHEN** 任何頁面渲染 Sidebar
- **THEN** 每個 nav item 左側顯示對應的 16px SVG icon

### 需求：所有互動元件不使用 inline style
`QueryPage`、`AuthPage`、`BookCard` 等元件**不得**使用 `style={{ }}` prop 來定義可以透過 CSS class 表達的視覺樣式。

#### 情境：QueryPage 的表單元素使用 CSS class
- **WHEN** 渲染 QueryPage
- **THEN** input 和 button 元素使用 `.input` / `.btn` class，不含 style prop

### 需求：Tag chip 為全圓角樣式
`.tag-chip` class **必須**使用 `border-radius: 999px`，呈現現代 pill 形狀。

#### 情境：Tag chip 外觀
- **WHEN** 任何頁面渲染 `.tag-chip` 元素
- **THEN** chip 為完整圓角 pill 形狀，背景為 accent 色 15% opacity
