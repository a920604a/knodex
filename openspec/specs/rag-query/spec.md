## ADDED Requirements

### Requirement: RAG Query Endpoint
系統 SHALL 提供 POST /query 端點，接受自然語言問題，在 user 自己的向量索引中搜尋相關段落，透過 CF Workers AI LLM 生成答案，回傳 answer 和 sources。此端點 SHALL 要求 JWT 登入。

#### Scenario: Successful query
- **WHEN** 已登入 user 發送 POST /query `{"query": "transformer 的 attention 機制是什麼？"}`
- **THEN** 系統回傳 200 + `{answer: "...", sources: [{type, document_title, page, content}, ...]}`

#### Scenario: Unauthenticated query
- **WHEN** 未登入 user 呼叫 POST /query
- **THEN** 系統回傳 401 Unauthorized

#### Scenario: Empty knowledge base
- **WHEN** user 尚未上傳任何文件，發送 POST /query
- **THEN** 系統回傳 200 + `{answer: "目前知識庫沒有相關資料。", sources: []}`

---

### Requirement: Query Daily Rate Limit
系統 SHALL 追蹤每個 user 當日（UTC）的 query 次數。超過 user.daily_query_limit 時，拒絕請求。

#### Scenario: Query within daily limit
- **WHEN** user 今日 query 次數 < daily_query_limit
- **THEN** 系統正常處理並記錄到 query_logs

#### Scenario: Query exceeds daily limit
- **WHEN** user 今日 query 次數已達 daily_query_limit
- **THEN** 系統回傳 429 Too Many Requests + `{detail: "Daily query limit reached", limit: N, reset_at: "UTC 00:00"}`

---

### Requirement: Per-user Vector Search Isolation
query 向量搜尋 SHALL 強制 filter `user_id == current_user.id`，確保不搜尋到其他 user 的 chunks 或 highlights。

#### Scenario: User A query cannot return User B's content
- **WHEN** user A 發送 query，user B 有語意相關的文件
- **THEN** 搜尋結果 SHALL 不包含 user B 的任何 chunk 或 highlight

---

### Requirement: Source Type in Response
query 回應的 sources 陣列 SHALL 標示每個來源的 source_type（chunk 或 highlight），讓 user 知道答案來自原文還是自己畫的重點。

#### Scenario: Answer includes highlight source
- **WHEN** query 結果包含來自 highlight 的段落
- **THEN** sources 陣列中該項目的 type 為 `"highlight"`，並包含對應的 document_title 和 page

#### Scenario: Answer includes chunk source
- **WHEN** query 結果包含來自原文 chunk 的段落
- **THEN** sources 陣列中該項目的 type 為 `"chunk"`

---

### Requirement: Query Logging
每次成功的 query SHALL 記錄到 query_logs 表（user_id, query_text, response_summary, tokens_used, created_at），用於 Admin dashboard 的統計和 rate limit 計算。

#### Scenario: Query logged after success
- **WHEN** query 成功完成
- **THEN** query_logs 新增一筆記錄，created_at 為 UTC 當下時間
