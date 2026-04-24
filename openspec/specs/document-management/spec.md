## MODIFIED Requirements

### Requirement: Document Upload Requires Authentication
文件上傳 SHALL 要求 JWT 登入。上傳的文件 SHALL 自動關聯到 current_user.id（documents.user_id）。未登入的請求 SHALL 被拒絕。

#### Scenario: Authenticated upload
- **WHEN** 已登入 user 上傳 PDF
- **THEN** 文件建立並設定 user_id = current_user.id，回傳 202

#### Scenario: Unauthenticated upload
- **WHEN** 未登入 user 呼叫 POST /documents
- **THEN** 系統回傳 401 Unauthorized

#### Scenario: Upload in full mode
- **WHEN** `isReaderMode === false`，使用者選取 PDF
- **THEN** 前端 POST `/documents` 上傳至後端，行為與現有相同

#### Scenario: Upload in reader mode
- **WHEN** `isReaderMode === true`，使用者選取 PDF
- **THEN** 前端不發 HTTP，建立 blob URL，寫入 localStorage metadata，書庫列表即時顯示

---

### Requirement: Document List Scoped to Current User
GET /documents SHALL 只回傳 current_user 的文件。無法透過 list 看到其他 user 的文件。

#### Scenario: User sees only own documents
- **WHEN** user A 呼叫 GET /documents，系統中同時存在 user A 和 user B 的文件
- **THEN** 回傳的列表僅包含 user A 的文件

#### Scenario: List in reader mode
- **WHEN** `isReaderMode === true`，DocumentListPage 載入
- **THEN** 從 localStorage 讀取 metadata 並渲染書庫，無任何 API 呼叫

---

### Requirement: Document Delete Cascades to Vectorize
刪除文件時，系統 SHALL 除了現有的 DB cascade（chunks, highlights, tags）和 MinIO 刪除之外，同時刪除 CF Vectorize 中該 document 所有對應的 vector points（chunks 和 highlights）。

#### Scenario: Document deleted removes vectors
- **WHEN** user 刪除文件
- **THEN** 系統從 DB、MinIO、CF Vectorize 全部清除該文件相關資料，後續 query 不再出現該文件的內容

#### Scenario: Delete in reader mode
- **WHEN** `isReaderMode === true`，使用者確認刪除
- **THEN** localStorage 記錄清除，書庫列表更新，無任何 API 呼叫
