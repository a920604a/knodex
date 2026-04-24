## ADDED Requirements

### Requirement: Document Has Thumbnail Path Field
Document model SHALL 包含 `thumb_path` 欄位（nullable TEXT），儲存 MinIO 縮圖 object key。新建文件時預設為 NULL，ingestion 完成後由系統填入。

#### Scenario: New document before ingestion
- **WHEN** 文件剛上傳完成，ingestion 尚未執行
- **THEN** `documents.thumb_path` 為 NULL

#### Scenario: Document after successful ingestion
- **WHEN** ingestion 完成且縮圖成功生成
- **THEN** `documents.thumb_path` 為非 NULL string（MinIO object key）

---

### Requirement: Document Delete Removes Thumbnail
刪除文件時，系統 SHALL 同時刪除 MinIO 中對應的縮圖（若 `thumb_path` 非 NULL）。

#### Scenario: Delete document with thumbnail
- **WHEN** user 刪除有 thumb_path 的文件
- **THEN** MinIO 中 PDF 與縮圖均被刪除，DB 記錄 cascade 刪除
