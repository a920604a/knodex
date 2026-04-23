## ADDED Requirements

### Requirement: 上傳 PDF 文件
系統 SHALL 接受 PDF 檔案上傳，儲存至本地/NAS 路徑，並在資料庫建立文件記錄，初始狀態為 `unread`。

#### Scenario: 成功上傳 PDF
- **WHEN** 使用者透過 `POST /documents` 上傳有效 PDF 檔案
- **THEN** 系統儲存檔案至 `PDF_STORAGE_ROOT` 目錄，回傳 201 含新文件 `id`、`title`（從檔名推導）、`status: "unread"`、`progress: 0`

#### Scenario: 上傳非 PDF 檔案
- **WHEN** 使用者上傳非 PDF MIME 類型的檔案
- **THEN** 系統回傳 400 錯誤，不儲存任何檔案

#### Scenario: 重複上傳相同檔案
- **WHEN** 使用者上傳與現有文件相同檔名且相同大小的檔案
- **THEN** 系統仍建立新的文件記錄（不去重），並儲存為獨立檔案

---

### Requirement: 列出所有文件
系統 SHALL 提供文件列表 API，回傳所有已上傳文件的摘要資訊。

#### Scenario: 取得文件列表
- **WHEN** 使用者呼叫 `GET /documents`
- **THEN** 系統回傳陣列，每筆含 `id`、`title`、`status`、`progress`、`total_pages`、`created_at`

#### Scenario: 無文件時取得列表
- **WHEN** 系統中無任何文件，使用者呼叫 `GET /documents`
- **THEN** 系統回傳空陣列 `[]`，HTTP 200

---

### Requirement: 取得單一文件詳情
系統 SHALL 允許依 `id` 取得文件完整資訊。

#### Scenario: 取得存在的文件
- **WHEN** 使用者呼叫 `GET /documents/{id}` 且該文件存在
- **THEN** 系統回傳完整文件欄位：`id`、`title`、`file_path`、`status`、`progress`、`total_pages`、`created_at`、`updated_at`

#### Scenario: 取得不存在的文件
- **WHEN** 使用者呼叫 `GET /documents/{id}` 且該 id 不存在
- **THEN** 系統回傳 404

---

### Requirement: 更新閱讀進度
系統 SHALL 允許更新文件的閱讀進度與狀態。

#### Scenario: 更新進度與狀態
- **WHEN** 使用者透過 `POST /documents/{id}/progress` 提交 `{ "page": 42, "status": "reading" }`
- **THEN** 系統更新 `progress`（= page / total_pages，介於 0.0～1.0）與 `status`，回傳更新後的文件

#### Scenario: 進度超過總頁數
- **WHEN** 使用者提交的 `page` 大於 `total_pages`
- **THEN** 系統回傳 400 錯誤

#### Scenario: 狀態設為 done
- **WHEN** 使用者提交 `{ "status": "done" }`
- **THEN** 系統將 `progress` 設為 `1.0`，`status` 設為 `"done"`
