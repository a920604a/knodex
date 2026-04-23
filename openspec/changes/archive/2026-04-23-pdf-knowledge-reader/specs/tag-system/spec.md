## ADDED Requirements

### Requirement: 建立標籤
系統 SHALL 允許建立標籤，支援指定父標籤以形成階層結構。

#### Scenario: 建立根標籤
- **WHEN** 使用者透過 `POST /tags` 提交 `{ "name": "技術筆記" }`（不含 `parent_id`）
- **THEN** 系統建立 `parent_id: null` 的標籤，回傳 201 含 `id`、`name`、`parent_id`

#### Scenario: 建立子標籤
- **WHEN** 使用者提交 `{ "name": "Python", "parent_id": "existing-uuid" }`
- **THEN** 系統建立該標籤並設定父子關係，回傳 201

#### Scenario: 父標籤不存在
- **WHEN** 使用者提交的 `parent_id` 不對應任何標籤
- **THEN** 系統回傳 404

#### Scenario: 標籤名稱重複（同層）
- **WHEN** 使用者在同一 `parent_id` 下建立已存在名稱的標籤
- **THEN** 系統回傳 409 Conflict

---

### Requirement: 列出所有標籤（扁平列表）
系統 SHALL 提供所有標籤的扁平列表，含父子關係欄位。

#### Scenario: 取得標籤列表
- **WHEN** 使用者呼叫 `GET /tags`
- **THEN** 系統回傳所有標籤陣列，每筆含 `id`、`name`、`parent_id`

---

### Requirement: 取得標籤樹狀結構
系統 SHALL 以巢狀 JSON 回傳完整標籤階層。

#### Scenario: 取得樹狀結構
- **WHEN** 使用者呼叫 `GET /tags/tree`
- **THEN** 系統回傳根標籤陣列，每個根標籤含遞迴 `children` 欄位

#### Scenario: 無標籤時取得樹狀結構
- **WHEN** 系統中無任何標籤
- **THEN** 系統回傳空陣列 `[]`

---

### Requirement: 刪除標籤
系統 SHALL 允許刪除標籤，並處理子標籤與畫線關聯。

#### Scenario: 刪除葉節點標籤
- **WHEN** 使用者呼叫 `DELETE /tags/{id}` 且該標籤無子標籤
- **THEN** 系統刪除標籤與所有 `highlight_tags` 關聯，回傳 204

#### Scenario: 刪除含子標籤的標籤
- **WHEN** 使用者呼叫 `DELETE /tags/{id}` 且該標籤有子標籤
- **THEN** 系統回傳 409，提示需先刪除子標籤或使用 `?cascade=true`

#### Scenario: 使用 cascade 強制刪除
- **WHEN** 使用者呼叫 `DELETE /tags/{id}?cascade=true`
- **THEN** 系統遞迴刪除所有子標籤及相關 `highlight_tags` 關聯，回傳 204
