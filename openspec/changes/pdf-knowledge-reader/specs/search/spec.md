## ADDED Requirements

### Requirement: 全文搜尋文件與畫線
系統 SHALL 提供統一搜尋端點，同時查詢文件標題與畫線文字/筆記，回傳分類結果。

#### Scenario: 關鍵字搜尋有結果
- **WHEN** 使用者呼叫 `GET /search?q=機器學習`
- **THEN** 系統回傳 `{ "documents": [...], "highlights": [...] }`，包含所有包含關鍵字的文件標題與畫線文字或筆記（大小寫不敏感）

#### Scenario: 關鍵字搜尋無結果
- **WHEN** 搜尋關鍵字無任何匹配
- **THEN** 系統回傳 `{ "documents": [], "highlights": [] }`，HTTP 200

#### Scenario: 空白關鍵字
- **WHEN** 使用者呼叫 `GET /search?q=`（空字串）
- **THEN** 系統回傳 400，提示 `q` 不得為空

---

### Requirement: 依標籤篩選畫線
系統 SHALL 允許透過標籤名稱或 id 篩選畫線。

#### Scenario: 依標籤名稱篩選
- **WHEN** 使用者呼叫 `GET /highlights?tag=Python`
- **THEN** 系統回傳所有含名稱為 "Python" 標籤的畫線

#### Scenario: 標籤不存在
- **WHEN** 使用者篩選的標籤名稱不存在
- **THEN** 系統回傳空陣列，HTTP 200

#### Scenario: 依標籤 id 篩選
- **WHEN** 使用者呼叫 `GET /highlights?tag_id={uuid}`
- **THEN** 系統回傳所有含該 tag_id 的畫線

---

### Requirement: 組合搜尋（關鍵字 + 標籤）
系統 SHALL 支援同時以關鍵字與標籤篩選畫線。

#### Scenario: 關鍵字與標籤組合篩選
- **WHEN** 使用者呼叫 `GET /highlights?q=梯度下降&tag=Python`
- **THEN** 系統回傳同時滿足：文字或筆記含「梯度下降」且含「Python」標籤的畫線

#### Scenario: 組合條件無結果
- **WHEN** 沒有畫線同時滿足兩個條件
- **THEN** 系統回傳空陣列，HTTP 200
