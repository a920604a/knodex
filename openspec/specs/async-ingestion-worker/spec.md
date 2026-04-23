## ADDED Requirements

### Requirement: Redis Queue Enqueue on Upload
文件上傳成功後，系統 SHALL 立即將 `ingest_document` 任務 enqueue 到 Redis，而非在 API process 中執行 ingestion。API SHALL 回傳 202 並設定 ingestion_status 為 `pending`。

#### Scenario: Document uploaded successfully
- **WHEN** user 上傳有效 PDF
- **THEN** 系統建立 document 記錄（ingestion_status: pending），將任務推入 Redis queue，回傳 202 + `{document_id, ingestion_status: "pending"}`

---

### Requirement: Worker Ingest Document Task
ARQ Worker SHALL 消費 `ingest_document` 任務，執行完整 pipeline：parse PDF → chunk → embed（CF Workers AI）→ upsert CF Vectorize → 更新 ingestion_status。

#### Scenario: Successful ingestion
- **WHEN** Worker 取得 `ingest_document(document_id)` 任務
- **THEN** 系統依序執行 parse → chunk → embed → Vectorize upsert，最後將 ingestion_status 設為 `completed`

#### Scenario: Ingestion failure with retry
- **WHEN** ingestion 過程中發生錯誤（CF API timeout、MinIO 讀取失敗等）
- **THEN** Worker retry，最多 3 次；第 3 次仍失敗則 ingestion_status 設為 `failed`

#### Scenario: Document not found in Worker
- **WHEN** Worker 取得任務但 DB 找不到該 document_id
- **THEN** Worker 記錄 warning log 並放棄任務（不 retry）

---

### Requirement: Vectorize Point Schema
每個 upsert 到 CF Vectorize 的 vector point SHALL 包含以下 metadata payload，用於 per-user 查詢隔離：

```
{
  user_id: string,
  document_id: string,
  source_type: "chunk" | "highlight",
  page: int,
  chunk_index: int,       // chunk 才有
  highlight_id: string,   // highlight 才有
  content: string
}
```

#### Scenario: Chunk upserted to Vectorize
- **WHEN** Worker 完成 chunk embedding
- **THEN** Vectorize point 包含 source_type: "chunk" 和正確的 user_id、document_id、page、chunk_index

---

### Requirement: Worker Independent Scaling
Worker process SHALL 與 FastAPI process 完全分離，可獨立啟動多個 instance 消費同一個 Redis queue。

#### Scenario: Multiple worker instances
- **WHEN** 啟動 2 個 Worker instance
- **THEN** 兩個 Worker 各自消費 queue 中不同的任務，不重複處理
