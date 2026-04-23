## 新增需求

### 需求：使用者可以用 Google 帳號登入
系統**必須**允許任何持有有效 Google 帳號的使用者透過 Firebase Google 登入進行身份驗證。驗證成功後，後端**必須**回傳與現有格式相同的自簽 JWT。

#### 情境：首次登入成功
- **當** 新使用者在瀏覽器完成 Google 登入，前端將 Firebase ID Token 傳送至 `POST /auth/firebase`
- **則** 後端驗證 token，以 `firebase_uid` 和 `email` 建立新的 User 資料列，並回傳 `{ access_token }`，HTTP 200

#### 情境：既有使用者再次登入
- **當** 已存在的使用者完成 Google 登入，前端傳送 Firebase ID Token 至 `POST /auth/firebase`
- **則** 後端以 `firebase_uid` 找到既有 User，回傳 `{ access_token }`，不建立重複資料列

#### 情境：Firebase ID Token 無效
- **當** 前端傳送無效或已過期的 Firebase ID Token 至 `POST /auth/firebase`
- **則** 後端回傳 HTTP 401 與錯誤訊息

### 需求：帳號密碼登入已移除
系統**不得**接受帳號密碼憑證。`POST /auth/register` 和 `POST /auth/login` 端點**必須**被移除。

#### 情境：呼叫已移除的端點
- **當** 用戶端傳送請求至 `POST /auth/register` 或 `POST /auth/login`
- **則** 伺服器回傳 HTTP 404

### 需求：登出時清除 Firebase session
登出時，系統**必須**同時清除本地 JWT 和 Firebase Auth session。

#### 情境：使用者登出
- **當** 使用者在前端觸發登出
- **則** Firebase `signOut()` 被呼叫，且本地 JWT 從儲存空間移除

### 需求：受保護路由不受影響
所有受 `get_current_user` 保護的路由**必須**在不修改的情況下繼續運作。JWT 格式與驗證邏輯**必須**保持不變。

#### 情境：Firebase 登入後的認證請求
- **當** 前端以從 `/auth/firebase` 取得的 JWT 傳送 `Authorization: Bearer <JWT>` 請求至任意 API
- **則** 後端以現有的 `decode_token` 邏輯驗證 JWT，並回傳預期的回應
