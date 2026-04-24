## ADDED Requirements

### Requirement: Thumbnail Generated During Ingestion
系統 SHALL 在 ingestion BackgroundTask 執行期間，自動擷取 PDF 第一頁並產生 JPEG 縮圖（目標寬度 180px，3:4 比例）。縮圖 SHALL 上傳至 MinIO，object key 格式為 `{document_uuid}_thumb.jpg`。成功後 SHALL 將 key 寫入 `documents.thumb_path`。

縮圖生成失敗（損毀 PDF、掃描版等）時，系統 SHALL 僅記錄 warning log，不影響 `ingestion_status` 欄位，`thumb_path` 維持 NULL。

#### Scenario: Normal PDF ingestion generates thumbnail
- **WHEN** PDF 含有可渲染的第一頁
- **THEN** ingestion 完成後 `documents.thumb_path` 為非 NULL，MinIO 中存在對應 JPEG

#### Scenario: Corrupted or scan-only PDF
- **WHEN** PDF 第一頁無法被 PyMuPDF 渲染（如純掃描影像、損毀檔案）
- **THEN** `ingestion_status` 仍設為 `completed`，`thumb_path` 為 NULL，後端 log 記錄 warning

#### Scenario: Reprocess regenerates thumbnail
- **WHEN** user 呼叫 `POST /documents/{id}/reprocess`
- **THEN** 系統重新執行完整 ingestion，包含縮圖生成，成功後覆寫 `thumb_path`

---

### Requirement: Thumbnail Presigned URL API
系統 SHALL 提供 `GET /documents/{id}/thumb-url` endpoint，回傳 `{ "url": "<MinIO presigned URL>" }`，有效期 1 小時。需要有效 JWT。

若 `thumb_path` 為 NULL（縮圖尚未生成），系統 SHALL 回傳 404。

#### Scenario: Document has thumbnail
- **WHEN** 已登入 user 請求有 thumb_path 的文件縮圖 URL
- **THEN** 系統回傳 200 `{ "url": "..." }`，URL 可直接由瀏覽器載入圖片

#### Scenario: Document has no thumbnail
- **WHEN** 已登入 user 請求 thumb_path 為 NULL 的文件縮圖 URL
- **THEN** 系統回傳 404

#### Scenario: Unauthenticated request
- **WHEN** 未登入 user 呼叫 GET /documents/{id}/thumb-url
- **THEN** 系統回傳 401
