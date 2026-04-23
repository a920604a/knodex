## 為什麼

目前的帳號密碼認證系統需要自行管理密碼雜湊，對使用者造成額外的登入摩擦。改用 Firebase Google 登入可消除密碼管理複雜度、引入可信任的第三方身份驗證層，並提升使用者體驗。

## 變更內容

- **BREAKING** 移除 `POST /auth/register` 和 `POST /auth/login` 端點
- 新增 `POST /auth/firebase` 端點 — 驗證 Firebase ID Token 後回傳自簽 JWT
- 在 `users` 資料表新增 `firebase_uid` 欄位
- 移除 `password_hash` 欄位（不再需要）
- 將 `AuthPage` 的帳號密碼表單替換為「使用 Google 登入」按鈕
- 在後端新增 `firebase-admin` 套件依賴
- 在前端新增 `firebase` JS SDK 套件依賴
- 新增 Firebase 設定環境變數（`VITE_FIREBASE_*`、`FIREBASE_CREDENTIALS_JSON`）

## 功能範疇

### 新增功能

- `google-signin`：透過 Firebase 的 Google 登入進行使用者身份驗證。涵蓋完整流程：前端彈窗 → Firebase ID Token → 後端驗證 → JWT 簽發 → 使用者自動建立（upsert）。

### 修改現有功能

（無 — 現有的 JWT session 機制與所有受保護路由均不變）

## 影響範圍

- **後端**：`app/routers/auth.py`、`app/services/auth_service.py`、`app/models/user.py`、`app/config.py`、`pyproject.toml`、新 Alembic migration
- **前端**：`src/pages/AuthPage.tsx`、`src/contexts/AuthContext.tsx`、新增 `src/lib/firebase.ts`、`package.json`
- **設定檔**：`docker-compose.yml`（frontend-dev 環境變數）、`.env.example`
- **套件依賴**：`firebase-admin`（Python）、`firebase`（npm）
