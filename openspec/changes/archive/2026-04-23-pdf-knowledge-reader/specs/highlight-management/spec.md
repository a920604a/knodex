## ADDED Requirements

### Requirement: 建立畫線
系統 SHALL 接受畫線建立請求，將選取文字、頁碼、offset 與筆記儲存為獨立知識單元。

#### Scenario: 成功建立畫線
- **WHEN** 使用者透過 `POST /highlights` 提交 `{ "document_id", "text", "page", "start_offset", "end_offset", "note"（可選）}`
- **THEN** 系統建立畫線記錄，回傳 201 含完整畫線物件（含 `id`、`created_at`）

#### Scenario: 缺少必要欄位
- **WHEN** 請求缺少 `document_id`、`text`、`page`、`start_offset` 或 `end_offset` 任一欄位
- **THEN** 系統回傳 422，說明缺少的欄位

#### Scenario: 關聯不存在的文件
- **WHEN** `document_id` 對應的文件不存在
- **THEN** 系統回傳 404

---

### Requirement: 查詢畫線列表
系統 SHALL 提供畫線列表 API，支援依文件篩選。

#### Scenario: 取得所有畫線
- **WHEN** 使用者呼叫 `GET /highlights`
- **THEN** 系統回傳所有畫線，依 `created_at` 降冪排序

#### Scenario: 依文件篩選畫線
- **WHEN** 使用者呼叫 `GET /highlights?document_id={id}`
- **THEN** 系統只回傳屬於該文件的畫線，依頁碼與 `start_offset` 升冪排序

---

### Requirement: 取得單一畫線
系統 SHALL 允許依 `id` 取得畫線完整資訊，含已掛載的標籤。

#### Scenario: 取得存在的畫線
- **WHEN** 使用者呼叫 `GET /highlights/{id}`
- **THEN** 系統回傳畫線完整欄位與 `tags` 陣列（可為空）

#### Scenario: 取得不存在的畫線
- **WHEN** 使用者呼叫 `GET /highlights/{id}` 且該 id 不存在
- **THEN** 系統回傳 404

---

### Requirement: 編輯畫線筆記
系統 SHALL 允許更新畫線的 `note` 欄位。

#### Scenario: 更新筆記
- **WHEN** 使用者透過 `PATCH /highlights/{id}` 提交 `{ "note": "新筆記內容" }`
- **THEN** 系統更新筆記，回傳更新後的畫線物件

#### Scenario: 清空筆記
- **WHEN** 使用者提交 `{ "note": "" }` 或 `{ "note": null }`
- **THEN** 系統將 `note` 設為空字串或 null，不視為錯誤

---

### Requirement: 刪除畫線
系統 SHALL 允許刪除畫線，並級聯刪除對應的 `highlight_tags` 關聯。

#### Scenario: 成功刪除
- **WHEN** 使用者呼叫 `DELETE /highlights/{id}`
- **THEN** 系統刪除畫線與所有 `highlight_tags` 記錄，回傳 204

#### Scenario: 刪除不存在的畫線
- **WHEN** 使用者呼叫 `DELETE /highlights/{id}` 且該 id 不存在
- **THEN** 系統回傳 404

---

### Requirement: 為畫線掛載標籤
系統 SHALL 允許為畫線附加一個或多個標籤。

#### Scenario: 新增標籤至畫線
- **WHEN** 使用者透過 `POST /highlights/{id}/tags` 提交 `{ "tag_ids": ["uuid1", "uuid2"] }`
- **THEN** 系統建立 `highlight_tags` 關聯，回傳更新後的畫線（含完整 tags 陣列）

#### Scenario: 重複掛載相同標籤
- **WHEN** 使用者掛載已存在的 tag_id
- **THEN** 系統忽略重複項（冪等），不報錯

#### Scenario: 移除畫線標籤
- **WHEN** 使用者透過 `DELETE /highlights/{id}/tags/{tag_id}`
- **THEN** 系統刪除對應 `highlight_tags` 記錄，回傳 204
