## ADDED Requirements

### Requirement: Document Ownership
每份文件 SHALL 屬於上傳的 user（documents.user_id FK）。系統 SHALL 在所有文件相關 query 強制帶入 user_id filter，確保 user 只能存取自己的文件。

#### Scenario: User lists own documents
- **WHEN** 已登入 user 呼叫 GET /documents
- **THEN** 系統只回傳該 user 的文件，不包含其他 user 的文件

#### Scenario: User cannot access other user's document
- **WHEN** user A 呼叫 GET /documents/{doc_id}，但該文件屬於 user B
- **THEN** 系統回傳 404 Not Found（不洩露文件存在）

---

### Requirement: PDF Upload Limit
系統 SHALL 在 upload 前檢查 user 目前的文件數量。若已達 user.pdf_limit，拒絕上傳。

#### Scenario: Upload within limit
- **WHEN** user 目前有 5 份文件，pdf_limit 為 10，上傳新文件
- **THEN** 系統接受上傳並回傳 201

#### Scenario: Upload exceeds limit
- **WHEN** user 目前文件數量已達 pdf_limit
- **THEN** 系統回傳 403 Forbidden，body 包含 `{detail: "PDF limit reached"}`

---

### Requirement: Document Delete Ownership Check
系統 SHALL 確保 user 只能刪除自己的文件。

#### Scenario: User deletes own document
- **WHEN** user 呼叫 DELETE /documents/{doc_id}，且該文件屬於自己
- **THEN** 系統刪除文件、MinIO 檔案和相關 Vectorize vectors，回傳 204

#### Scenario: User cannot delete other user's document
- **WHEN** user A 呼叫 DELETE /documents/{doc_id}，但該文件屬於 user B
- **THEN** 系統回傳 404 Not Found
