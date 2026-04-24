## ADDED Requirements

### Requirement: Admin User List
系統 SHALL 提供 GET /admin/users，回傳所有 user 的列表，包含每個 user 的基本資料和當前使用狀況。此端點 SHALL 要求 admin role。

回傳欄位：id, email, role, pdf_count（當前文件數）, today_query_count（今日 query 次數）, pdf_limit, daily_query_limit, created_at。

#### Scenario: Admin fetches user list
- **WHEN** admin 呼叫 GET /admin/users
- **THEN** 系統回傳所有 user 的陣列，每個 user 包含 pdf_count 和 today_query_count

#### Scenario: Non-admin blocked
- **WHEN** role 為 user 的帳號呼叫 GET /admin/users
- **THEN** 系統回傳 403 Forbidden

---

### Requirement: Admin Update User Limits
系統 SHALL 提供 PATCH /admin/users/{user_id}，允許 admin 修改特定 user 的 pdf_limit 和 daily_query_limit。

#### Scenario: Admin updates pdf_limit
- **WHEN** admin 呼叫 PATCH /admin/users/{id} `{"pdf_limit": 20}`
- **THEN** 系統更新該 user 的 pdf_limit 並回傳更新後的 user 資料

#### Scenario: Admin updates daily_query_limit
- **WHEN** admin 呼叫 PATCH /admin/users/{id} `{"daily_query_limit": 50}`
- **THEN** 系統更新該 user 的 daily_query_limit 立即生效（下一次 query 即採用新限額）

#### Scenario: Target user not found
- **WHEN** admin 呼叫 PATCH /admin/users/{non_existent_id}
- **THEN** 系統回傳 404 Not Found

---

### Requirement: System Stats Overview
系統 SHALL 提供 GET /admin/stats，回傳系統層級的統計數據，供 admin 監控整體使用狀況。

回傳欄位：total_users, total_documents, today_total_queries, worker_queue_depth（Redis queue 待處理任務數）。

#### Scenario: Admin fetches system stats
- **WHEN** admin 呼叫 GET /admin/stats
- **THEN** 系統回傳包含 total_users, total_documents, today_total_queries, worker_queue_depth 的 JSON

#### Scenario: Worker queue depth reflects pending tasks
- **WHEN** 有 5 個 document 正在等待 ingestion
- **THEN** GET /admin/stats 的 worker_queue_depth ≥ 5
