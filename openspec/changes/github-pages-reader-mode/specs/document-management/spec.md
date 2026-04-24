## MODIFIED Requirements

### Requirement: Document upload
Reader mode 下，文件上傳 SHALL 改為本地選取。點擊「+ 上傳 PDF」後選取檔案，前端 SHALL 以 `URL.createObjectURL` 建立 blob URL，不發送任何 HTTP 請求。Full mode 行為不變（上傳至後端 MinIO）。

#### Scenario: Upload in full mode
- **WHEN** `isReaderMode === false`，使用者選取 PDF
- **THEN** 前端 POST `/documents` 上傳至後端，行為與現有相同

#### Scenario: Upload in reader mode
- **WHEN** `isReaderMode === true`，使用者選取 PDF
- **THEN** 前端不發 HTTP，建立 blob URL，寫入 localStorage metadata，書庫列表即時顯示

### Requirement: Document list
Reader mode 下，文件列表 SHALL 從 localStorage 讀取，不呼叫 `GET /documents`。Full mode 行為不變。

#### Scenario: List in reader mode
- **WHEN** `isReaderMode === true`，DocumentListPage 載入
- **THEN** 從 localStorage 讀取 metadata 並渲染書庫，無任何 API 呼叫

### Requirement: Document deletion
Reader mode 下，刪除文件 SHALL 清除 localStorage 中的 metadata 與 progress record，不呼叫 `DELETE /documents/{id}`。Full mode 行為不變。

#### Scenario: Delete in reader mode
- **WHEN** `isReaderMode === true`，使用者確認刪除
- **THEN** localStorage 記錄清除，書庫列表更新，無任何 API 呼叫
