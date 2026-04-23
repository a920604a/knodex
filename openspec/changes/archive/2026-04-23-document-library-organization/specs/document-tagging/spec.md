## ADDED Requirements

### Requirement: 建立文件標籤
系統 SHALL 提供獨立於 highlight tags 的文件標籤系統，支援指定父標籤以形成文件主題樹。

#### Scenario: 建立文件根標籤
- **WHEN** 使用者透過 `POST /document-tags` 提交 `{ "name": "機器學習" }`
- **THEN** 系統建立 `parent_id: null` 的文件標籤，回傳 201 含 `id`、`name`、`parent_id`

#### Scenario: 建立文件子標籤
- **WHEN** 使用者透過 `POST /document-tags` 提交 `{ "name": "NLP", "parent_id": "existing-uuid" }`
- **THEN** 系統建立對應父子關係的文件標籤，回傳 201

#### Scenario: 文件標籤父節點不存在
- **WHEN** 使用者提交的 `parent_id` 不對應任何文件標籤
- **THEN** 系統回傳 404

### Requirement: 取得文件標籤列表與樹狀結構
系統 SHALL 提供文件標籤的扁平列表與樹狀結構查詢，且不混入 highlight tags。

#### Scenario: 取得文件標籤扁平列表
- **WHEN** 使用者呼叫 `GET /document-tags`
- **THEN** 系統回傳文件標籤陣列，每筆含 `id`、`name`、`parent_id`

#### Scenario: 取得文件標籤樹
- **WHEN** 使用者呼叫 `GET /document-tags/tree`
- **THEN** 系統回傳根文件標籤陣列，每個節點含遞迴 `children`

#### Scenario: highlight tags 不受影響
- **WHEN** 使用者呼叫既有 `GET /tags` 或 `GET /tags/tree`
- **THEN** 系統仍只回傳 highlight tags，不包含任何 document tags

### Requirement: 掛載與移除文件標籤
系統 SHALL 允許在文件上掛載多個文件標籤，並可個別移除，且操作須具冪等性。

#### Scenario: 對文件掛載文件標籤
- **WHEN** 使用者透過 `POST /documents/{id}/tags` 提交 `{ "tag_id": "existing-document-tag-uuid" }`
- **THEN** 系統建立文件與文件標籤的關聯，回傳更新後文件且其中包含 `document_tags`

#### Scenario: 重複掛載相同文件標籤
- **WHEN** 使用者再次對同一文件掛載相同的文件標籤
- **THEN** 系統不建立重複關聯，並回傳 200 或 201 的單一結果表示該關聯已存在

#### Scenario: 移除文件標籤
- **WHEN** 使用者呼叫 `DELETE /documents/{id}/tags/{tag_id}`
- **THEN** 系統刪除該文件與文件標籤的關聯，回傳 204

### Requirement: 刪除文件標籤時處理文件關聯
系統 SHALL 在刪除文件標籤時，一併清理文件標籤關聯，且不影響 highlight tags。

#### Scenario: 刪除葉節點文件標籤
- **WHEN** 使用者呼叫 `DELETE /document-tags/{id}` 且該文件標籤無子標籤
- **THEN** 系統刪除該文件標籤與所有文件關聯，回傳 204

#### Scenario: 刪除含子標籤的文件標籤
- **WHEN** 使用者呼叫 `DELETE /document-tags/{id}` 且該文件標籤有子標籤且未指定 `cascade=true`
- **THEN** 系統回傳 409，提示需先刪除子標籤或使用 cascade

#### Scenario: cascade 刪除文件標籤樹
- **WHEN** 使用者呼叫 `DELETE /document-tags/{id}?cascade=true`
- **THEN** 系統遞迴刪除所有子文件標籤與其文件關聯，回傳 204
