## ADDED Requirements

### Requirement: 建立全域 CSS Token 檔
系統 SHALL 提供 `src/styles/tokens.css`，定義所有設計變數，並在 `main.tsx` 中 global import。

#### Scenario: Token 檔存在且被載入
- **WHEN** 應用程式啟動
- **THEN** 所有 CSS 自訂屬性（`--color-*`、`--space-*`、`--radius-*`、`--shadow-*`、`--font-*`）在全域可用

#### Scenario: 無任何 hardcode 色彩值
- **WHEN** 檢視任何元件的 CSS class
- **THEN** 色彩值均透過 `var(--color-*)` 引用，不出現 hex / rgb 直接值

---

### Requirement: 色彩 Token 涵蓋 HIG System Colors
系統 SHALL 定義 label、background、surface、separator、fill、accent 六類色彩 token。

#### Scenario: Accent 色為紫色系
- **WHEN** 讀取 `--color-accent`
- **THEN** Light mode 值為 `#BF5AF2`，Dark mode 值為 `#BF5AF2`

#### Scenario: 背景層次區分
- **WHEN** 讀取背景相關 token
- **THEN** 存在至少三層：`--color-bg`（頁面）、`--color-surface`（Card）、`--color-surface-2`（次級 Panel）

---

### Requirement: 字型 Token 使用 SF Pro 系統字型 Stack
系統 SHALL 定義 `--font-sans` 指向系統字型，並定義 Large Title / Title / Body / Callout / Caption 五個字體大小 token。

#### Scenario: 使用系統字型
- **WHEN** 讀取 `--font-sans`
- **THEN** 值以 `-apple-system, BlinkMacSystemFont` 開頭

---

### Requirement: 間距與圓角 Token
系統 SHALL 提供 xs / sm / md / lg / xl 五個間距 token 及 sm / md / lg 三個圓角 token。

#### Scenario: 間距 token 可用
- **WHEN** CSS 中使用 `var(--space-md)`
- **THEN** 值為 `16px`
