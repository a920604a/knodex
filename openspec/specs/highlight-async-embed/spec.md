## ADDED Requirements

### Requirement: Highlight Embed on Create
highlight 建立後，系統 SHALL 立即將 `embed_highlight` 任務 enqueue 到 Redis。highlight 記錄 SHALL 帶有 embed_status 欄位（pending / done / failed），初始值為 `pending`。

#### Scenario: Highlight created
- **WHEN** user 建立新 highlight
- **THEN** 系統儲存 highlight（embed_status: pending）並 enqueue `embed_highlight(highlight_id)` 任務

---

### Requirement: Worker Embed Highlight Task
ARQ Worker SHALL 消費 `embed_highlight` 任務，embed highlight text 並 upsert 到 CF Vectorize，source_type 標記為 `highlight`。

#### Scenario: Successful highlight embed
- **WHEN** Worker 取得 `embed_highlight(highlight_id)` 任務
- **THEN** 系統呼叫 CF Workers AI embed highlight.text，upsert 到 Vectorize（payload 包含 user_id, document_id, source_type: "highlight", page），設定 embed_status: done

#### Scenario: Embed failure with retry
- **WHEN** embed 過程發生錯誤
- **THEN** Worker retry 最多 3 次；失敗後 embed_status 設為 `failed`

---

### Requirement: Highlight Searchable within Seconds
highlight embed 任務 SHALL 在建立後數秒內完成，使 user 在 query 時能立即搜尋到剛建立的 highlight（near-realtime，目標 < 10 秒）。

#### Scenario: Query finds recent highlight
- **WHEN** user 建立 highlight 後約 10 秒內發出 POST /query
- **THEN** query 結果 sources 中可能包含該 highlight（取決於語意相關性）

---

### Requirement: Highlight Delete Removes from Vectorize
highlight 刪除時，系統 SHALL 同步從 CF Vectorize 刪除對應的 vector point。

#### Scenario: Highlight deleted
- **WHEN** user 刪除 highlight
- **THEN** 系統從 DB 刪除 highlight 記錄，並從 CF Vectorize 刪除對應 vector point
