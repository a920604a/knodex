## ADDED Requirements

### Requirement: User Registration
系統 SHALL 允許任何人以 email + password 建立帳號。密碼 SHALL 使用 bcrypt hash 儲存，明文不得寫入 DB。新建帳號預設 role 為 `user`，pdf_limit 預設 10，daily_query_limit 預設 20。

#### Scenario: Successful registration
- **WHEN** POST /auth/register 帶有效 email 和長度 ≥ 8 的 password
- **THEN** 系統建立 user 記錄並回傳 201 + `{user_id, email, role}`

#### Scenario: Duplicate email
- **WHEN** POST /auth/register 帶已存在的 email
- **THEN** 系統回傳 409 Conflict

#### Scenario: Weak password
- **WHEN** POST /auth/register 帶長度 < 8 的 password
- **THEN** 系統回傳 422 Unprocessable Entity

---

### Requirement: User Login
系統 SHALL 接受 email + password 登入，驗證成功後回傳 JWT access token（HS256，有效期 7 天）。

#### Scenario: Successful login
- **WHEN** POST /auth/login 帶正確 email 和 password
- **THEN** 系統回傳 200 + `{access_token, token_type: "bearer"}`

#### Scenario: Wrong password
- **WHEN** POST /auth/login 帶正確 email 但錯誤 password
- **THEN** 系統回傳 401 Unauthorized

#### Scenario: Non-existent email
- **WHEN** POST /auth/login 帶未註冊的 email
- **THEN** 系統回傳 401 Unauthorized（不暴露 email 是否存在）

---

### Requirement: JWT Authentication Middleware
所有需要登入的端點 SHALL 驗證 Authorization: Bearer <token>。Token 失效或缺少時回傳 401。

#### Scenario: Valid token
- **WHEN** request 帶有效未過期 JWT
- **THEN** 系統正常處理請求，current_user 注入到 dependency

#### Scenario: Expired or invalid token
- **WHEN** request 帶過期或格式錯誤的 JWT
- **THEN** 系統回傳 401 Unauthorized

---

### Requirement: Role-based Access Control
系統 SHALL 區分 `admin` 和 `user` 兩個 role。`admin` 可存取 /admin/* 端點；`user` 不可存取。

#### Scenario: Admin accesses admin endpoint
- **WHEN** role 為 admin 的 user 呼叫 GET /admin/users
- **THEN** 系統正常回傳資料

#### Scenario: Regular user accesses admin endpoint
- **WHEN** role 為 user 的 user 呼叫 GET /admin/users
- **THEN** 系統回傳 403 Forbidden

---

### Requirement: Get Current User
系統 SHALL 提供 GET /auth/me 讓已登入 user 查看自己的資料（id, email, role, pdf_limit, daily_query_limit）。

#### Scenario: Authenticated user calls /auth/me
- **WHEN** 已登入 user 呼叫 GET /auth/me
- **THEN** 系統回傳 200 + user 基本資料（不含 password_hash）
