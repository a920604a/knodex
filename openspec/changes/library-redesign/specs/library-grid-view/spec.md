## ADDED Requirements

### Requirement: Responsive Book Grid
書庫 SHALL 以封面 Grid 方式呈現書目，使用 CSS `repeat(auto-fill, minmax(160px, 1fr))` 自動計算欄數，無需手動指定斷點欄數。Grid 最小欄寬 160px，確保在各螢幕尺寸下均可使用。

#### Scenario: Wide screen layout
- **WHEN** 視窗寬度（扣除 sidebar）大於 1000px
- **THEN** Grid 顯示 5 欄以上

#### Scenario: Narrow screen layout
- **WHEN** 視窗寬度（扣除 sidebar）小於 500px
- **THEN** Grid 顯示 2 欄，每欄至少 160px

---

### Requirement: Library Card Shows Cover and Progress
每個 LibraryCard SHALL 顯示封面圖片（presigned thumbnail URL）、書名（最多 2 行截斷）、進度條。封面圖片載入失敗或 thumb_path 為 NULL 時，SHALL fallback 至首字母漸層色塊（與 HeroShelf 現有邏輯相同）。

#### Scenario: Thumbnail available
- **WHEN** 書目有 thumb_path，thumbnail URL 載入成功
- **THEN** Card 顯示 PDF 第一頁縮圖作為封面

#### Scenario: No thumbnail fallback
- **WHEN** 書目 thumb_path 為 NULL，或 thumbnail URL 載入失敗
- **THEN** Card 顯示首字母漸層色塊作為 fallback

#### Scenario: Long title clamp
- **WHEN** 書名超過 2 行可顯示寬度
- **THEN** 第 2 行結尾以 `…` 截斷

---

### Requirement: Horizontal Topic Filter Bar
書目 filter SHALL 以橫向 pill 按鈕列（TopicBar）呈現，取代原有左側 TopicRail。TopicBar SHALL 包含「全部」選項及每個 tag，每個 pill 顯示名稱與數量。標籤過多時 TopicBar SHALL 可橫向捲動（hidden scrollbar）。

#### Scenario: Filter by tag
- **WHEN** user 點擊某個 tag pill
- **THEN** Grid 僅顯示包含該 tag 的書目，該 pill 呈現 active 樣式

#### Scenario: Reset filter
- **WHEN** user 點擊「全部」pill
- **THEN** Grid 顯示所有書目

#### Scenario: Many tags overflow
- **WHEN** tags 數量超過 TopicBar 可見寬度
- **THEN** TopicBar 可橫向捲動，無卷軸可見（scrollbar hidden），不換行

---

### Requirement: Card Hover Actions
LibraryCard hover 時，SHALL 顯示刪除按鈕與標籤管理按鈕（TopicDropdown trigger），不 hover 時隱藏。點擊 card 本體（非按鈕區域）SHALL 導航至 ReaderPage。

#### Scenario: Hover reveals actions
- **WHEN** user hover LibraryCard
- **THEN** 刪除按鈕與標籤管理按鈕出現（opacity transition）

#### Scenario: Card click navigates
- **WHEN** user 點擊 card 非按鈕區域
- **THEN** 導航至 `/reader/{id}`

#### Scenario: Action buttons stop propagation
- **WHEN** user 點擊刪除按鈕或標籤管理按鈕
- **THEN** 不觸發 card 的導航行為

---

### Requirement: Full-Width Page Layout
書庫頁面 SHALL 使用全寬 layout，移除 `max-width: 720px` 限制。`.page-content` class SHALL 僅保留 padding，不設 max-width。

#### Scenario: Wide screen uses full width
- **WHEN** 視窗寬度為 1440px
- **THEN** 書庫內容區域使用 sidebar 以外的全部寬度（約 1220px）

#### Scenario: Other pages benefit automatically
- **WHEN** QueryPage 或 TagManager 頁面開啟
- **THEN** 內容不再被 720px 限制，正常鋪滿可用寬度
