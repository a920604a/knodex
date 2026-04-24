## 背景

目前認證使用帳號密碼搭配 bcrypt 雜湊儲存於 Postgres，並搭配自簽 JWT（HS256，7 天有效期）。後端負責簽發 token；所有受保護路由透過 `get_current_user` 驗證。我們將把認證入口改為 Firebase Google 登入，同時保留現有的 JWT session 層。

## 目標 / 非目標

**目標：**
- 任何 Google 帳號皆可透過 `signInWithPopup` 登入
- 後端驗證 Firebase ID Token 後簽發自己的 JWT — 所有受保護路由不需改動
- 首次登入時自動建立 User 資料列（以 `firebase_uid` 做 upsert）
- 保留現有的 session 基礎設施（`create_access_token`、`decode_token`、`get_current_user`）

**非目標：**
- 支援多個 OAuth 提供者（GitHub、Apple 等）
- 使用 Firebase custom claims 管理角色
- 遷移現有帳號密碼使用者（平台完全轉換）
- 伺服器端渲染的認證流程

## 技術決策

### D1：Token 交換（Firebase ID Token → 自簽 JWT）vs. 每次請求帶 Firebase Token

**選擇：Token 交換。**
後端在登入時驗證一次 Firebase ID Token，然後簽發自簽 JWT。後續所有請求使用我們的 JWT，不帶 Firebase token。

**考慮過的替代方案：** 每次 API 請求帶 Firebase ID Token，由 `firebase-admin` 逐次驗證。

**理由：** 避免每次 API 請求都呼叫 Firebase Admin SDK（增加延遲與外部依賴）。我們的 JWT 在本地驗證，速度快。前端已有 token 儲存邏輯，`AuthContext` 狀態結構不需改變。

### D2：firebase-admin 初始化方式

Firebase Admin SDK 在應用程式啟動時以 service account JSON 檔案初始化一次。檔案路徑由 `FIREBASE_CREDENTIALS_JSON` 環境變數讀取。

**考慮過的替代方案：** 以環境變數直接放入 JSON 字串。

**理由：** 檔案掛載在 Docker 中更安全（避免大型 base64 字串出現在環境變數中），且與此專案的 secrets 處理方式一致。

### D3：User upsert 策略

在 `/auth/firebase`，以 `firebase_uid` 查詢使用者。找不到時，以 Firebase token 中的 `email` 建立新資料列，預設 `role="user"`。不以 email 單獨查詢，避免 Firebase UID 異動時發生帳號劫持。

### D4：password_hash 欄位

完全移除 `password_hash` 欄位。移除帳號密碼認證後，此欄位已無意義，留著只會造成混淆。Migration 直接 drop 該欄位。

## 風險 / 取捨

- **Firebase 服務中斷時無法登入** → 使用者無法登入，但現有 session（JWT）在有效期內仍然可用（7 天）。此平台的使用情境可接受此風險。
- **firebase-admin SDK 冷啟動** → 影響輕微，SDK 在應用程式啟動時初始化，不影響請求處理。
- **Service account 憑證外洩** → 緩解措施：以 Docker 檔案掛載方式注入，不 commit 進 repo，加入 `.gitignore`。

## 部署計畫

1. 執行 Alembic migration：新增 `firebase_uid` 欄位、移除 `password_hash`（應用程式啟動時自動執行）。
2. 部署新的後端 image，設定 `FIREBASE_CREDENTIALS_JSON` 環境變數指向掛載的憑證檔案。
3. 部署新的前端 build，設定 `VITE_FIREBASE_*` 環境變數。
4. 現有 session（JWT）在過期前仍然有效，不需強制登出。

## 未解決問題

（無）
