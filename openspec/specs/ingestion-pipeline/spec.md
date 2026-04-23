## MODIFIED Requirements

### Requirement: Ingestion Pipeline Includes Embedding and Vector Upsert
現有 pipeline（parse PDF → chunk → 存 DocumentChunk）SHALL 在 chunking 完成後，新增 embed 和 Vectorize upsert 步驟。每個 chunk 的文字 SHALL 透過 CF Workers AI embedding model（`@cf/baai/bge-small-en-v1.5`，384 dim）轉為向量，並 upsert 到 CF Vectorize index。

#### Scenario: Chunk embedded and upserted
- **WHEN** ingestion pipeline 完成 chunking
- **THEN** 每個 chunk SHALL 被 embed 並以 `{user_id, document_id, source_type: "chunk", page, chunk_index, content}` payload upsert 到 Vectorize

#### Scenario: CF Workers AI embed failure
- **WHEN** CF Workers AI API 回傳錯誤
- **THEN** Worker retry 整個任務（最多 3 次），ingestion_status 維持 `processing` 直到成功或達 retry 上限

---

### Requirement: Ingestion Status Tracking
文件 SHALL 有獨立的 ingestion_status 欄位（pending / processing / completed / failed），與閱讀進度的 status 欄位（unread / reading / done）完全分開。

#### Scenario: Ingestion status transitions
- **WHEN** 文件上傳後 Worker 開始處理
- **THEN** ingestion_status 從 `pending` 變為 `processing`，完成後變為 `completed`

#### Scenario: Failed ingestion status
- **WHEN** ingestion 在 3 次 retry 後仍失敗
- **THEN** ingestion_status 設為 `failed`，閱讀 status 不受影響
