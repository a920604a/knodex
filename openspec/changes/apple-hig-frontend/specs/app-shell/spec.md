## ADDED Requirements

### Requirement: 三欄式 Grid Layout
系統 SHALL 以 CSS Grid 實作全頁三欄結構：左側 sidebar（220px）、主內容（flex-1）、右側 Inspector（預設 0，Reader 模式 300px）。

#### Scenario: 預設兩欄（非 Reader 頁面）
- **WHEN** 使用者瀏覽文件列表、搜尋、標籤管理頁
- **THEN** 右側 Inspector 欄寬為 0，不佔空間，不顯示

#### Scenario: Reader 模式三欄
- **WHEN** 使用者進入 `/reader/:id`
- **THEN** 右側 Inspector 展開為 300px，顯示 HighlightSidebar

---

### Requirement: 左側毛玻璃 Sidebar
系統 SHALL 渲染固定寬度 220px 的左側導覽 sidebar，套用毛玻璃材質。

#### Scenario: 毛玻璃效果套用
- **WHEN** sidebar 背後有內容
- **THEN** sidebar 背景為半透明（opacity ~0.72）並套用 `backdrop-filter: blur(20px) saturate(180%)`

#### Scenario: 不支援 backdrop-filter 的瀏覽器
- **WHEN** 瀏覽器不支援 `backdrop-filter`
- **THEN** sidebar 降級為純色背景（`--color-surface`），功能不受影響

#### Scenario: Sidebar 固定不捲動
- **WHEN** 主內容區向下捲動
- **THEN** sidebar 維持固定位置（`position: sticky` 或 `fixed`）

---

### Requirement: Sidebar 導覽項目
系統 SHALL 在 sidebar 中顯示三個導覽項目：文件、搜尋、標籤，每項含 icon 與 label。

#### Scenario: 當前頁面項目標示 active
- **WHEN** 使用者在文件列表頁
- **THEN** 「文件」項目套用 active 樣式（accent 色背景 pill）

#### Scenario: 導覽項目 hover 效果
- **WHEN** 使用者 hover 導覽項目
- **THEN** 項目顯示輕微背景填色（`--color-fill`）

---

### Requirement: App 標題顯示於 Sidebar 頂部
系統 SHALL 在 sidebar 頂部顯示 app 名稱「Knodex」，使用 Large Title 字體。

#### Scenario: 標題顯示
- **WHEN** 任何頁面載入
- **THEN** sidebar 頂部顯示「Knodex」，字體大小 20px / 600 weight
