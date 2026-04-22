## ADDED Requirements

### Requirement: Button 元件 HIG 樣式
系統 SHALL 提供 `.btn`（次要）與 `.btn--primary`（主要，accent 色填充）兩種 Button class。

#### Scenario: Primary Button 外觀
- **WHEN** 元素套用 `.btn.btn--primary`
- **THEN** 背景為 `--color-accent`，文字為白色，圓角 `--radius-sm`，無邊框，padding 8px 16px

#### Scenario: 次要 Button 外觀
- **WHEN** 元素套用 `.btn`
- **THEN** 背景為 `--color-fill`，文字為 `--color-label`，圓角 `--radius-sm`

#### Scenario: Button hover / active 狀態
- **WHEN** 使用者 hover 按鈕
- **THEN** 亮度微降（`filter: brightness(0.92)`），transition 80ms

#### Scenario: Button disabled 狀態
- **WHEN** 按鈕設為 `disabled`
- **THEN** opacity 0.4，cursor not-allowed

---

### Requirement: Input 元件 HIG 樣式
系統 SHALL 提供 `.input` class，外觀對應 iOS / macOS text field。

#### Scenario: Input 外觀
- **WHEN** 元素套用 `.input`
- **THEN** 背景為 `--color-fill`，無邊框，圓角 `--radius-sm`，padding 7px 10px，字體 Body size

#### Scenario: Input focus 狀態
- **WHEN** 使用者 focus input
- **THEN** 顯示 2px `--color-accent` outline，offset 2px

---

### Requirement: Card 元件 HIG 樣式
系統 SHALL 提供 `.card` class，對應 macOS grouped list row 外觀。

#### Scenario: Card 外觀
- **WHEN** 元素套用 `.card`
- **THEN** 背景為 `--color-surface`，圓角 `--radius-md`，陰影 `--shadow-sm`，padding `--space-md`

#### Scenario: Card hover 可點擊狀態
- **WHEN** `.card` 加上 `.card--clickable` 且使用者 hover
- **THEN** 陰影升為 `--shadow-md`，transition 150ms

---

### Requirement: Modal 元件 HIG 樣式
系統 SHALL 提供 `.modal-overlay` 與 `.modal` class，對應 macOS sheet 外觀。

#### Scenario: Modal overlay
- **WHEN** modal 開啟
- **THEN** overlay 為 `rgba(0,0,0,0.4)` 半透明黑，覆蓋全頁

#### Scenario: Modal panel 外觀
- **WHEN** modal panel 顯示
- **THEN** 背景 `--color-surface`，圓角 `--radius-lg`，陰影 `--shadow-md`，最大寬度 480px，置中

---

### Requirement: Tag Chip 元件 HIG 樣式
系統 SHALL 提供 `.tag-chip` class，對應 iOS tag pill 外觀。

#### Scenario: Tag chip 外觀
- **WHEN** 元素套用 `.tag-chip`
- **THEN** 背景 `rgba(191,90,242,0.12)`（accent 淡化），文字 `--color-accent`，圓角 999px（pill），padding 2px 8px，字體 Caption size

---

### Requirement: Highlight Card 樣式
系統 SHALL 提供 `.highlight-card` class 用於側欄畫線項目。

#### Scenario: Highlight card 外觀
- **WHEN** 元素套用 `.highlight-card`
- **THEN** 背景 `--color-surface-2`，左側 3px accent 色 border，圓角 `--radius-sm`，padding `--space-sm`

---

### Requirement: Separator 樣式
系統 SHALL 提供 `.separator` class，對應 HIG 分隔線（1px、inset）。

#### Scenario: Separator 外觀
- **WHEN** 元素套用 `.separator`
- **THEN** 高度 1px，背景 `--color-separator`，無 margin 外露
