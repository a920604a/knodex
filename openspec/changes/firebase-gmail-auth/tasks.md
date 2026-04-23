## 1. 後端 — 套件與設定

- [x] 1.1 在 `backend/pyproject.toml` 新增 `firebase-admin` 依賴
- [x] 1.2 執行 `uv lock` 更新 `uv.lock`
- [x] 1.3 在 `app/config.py` 新增 `firebase_credentials_json: str` 欄位（讀取 `FIREBASE_CREDENTIALS_JSON` 環境變數）
- [x] 1.4 建立 `app/services/firebase.py`，實作 Firebase Admin SDK 單例初始化

## 2. 後端 — 資料庫 Migration

- [x] 2.1 在 `app/models/user.py` 的 `User` model 新增 `firebase_uid` 欄位（VARCHAR、unique、nullable）
- [x] 2.2 從 `User` model 移除 `password_hash` 欄位
- [x] 2.3 建立 Alembic migration `0006_firebase_uid.py` — 新增 `firebase_uid` 欄位、移除 `password_hash` 欄位

## 3. 後端 — Auth 端點

- [x] 3.1 在 `app/routers/auth.py` 新增 `POST /auth/firebase` 端點 — 接收 `{ id_token }`，以 firebase-admin 驗證，upsert User，回傳 JWT
- [x] 3.2 從 `app/routers/auth.py` 移除 `POST /auth/register` 和 `POST /auth/login` 端點
- [x] 3.3 從 `app/services/auth_service.py` 移除帳號密碼相關函式（`hash_password`、`verify_password`、`register`、`login`）

## 4. 後端 — Docker 設定

- [x] 4.1 在 `docker-compose.yml` 的 `backend` 和 `worker` 服務新增 `FIREBASE_CREDENTIALS_JSON` 環境變數
- [x] 4.2 在 `.env.example` 新增 `FIREBASE_CREDENTIALS_JSON` 範例設定

## 5. 前端 — Firebase SDK 設定

- [x] 5.1 在 `frontend/` 安裝 `firebase` 套件（`npm install firebase`）
- [x] 5.2 建立 `src/lib/firebase.ts` — 以 `import.meta.env.VITE_FIREBASE_*` 初始化 Firebase app，匯出 `auth` 和 `googleProvider`
- [x] 5.3 在 `docker-compose.yml` 的 frontend-dev 服務新增 `VITE_FIREBASE_API_KEY`、`VITE_FIREBASE_AUTH_DOMAIN`、`VITE_FIREBASE_PROJECT_ID`、`VITE_FIREBASE_APP_ID` 環境變數
- [x] 5.4 在 `.env.example` 新增相同的 `VITE_FIREBASE_*` 環境變數

## 6. 前端 — 認證流程

- [x] 6.1 將 `AuthPage.tsx` 的帳號密碼表單替換為「使用 Google 登入」按鈕 — 呼叫 `signInWithPopup`，取得 ID Token，POST 至 `/auth/firebase`，呼叫 `login(token, me)`
- [x] 6.2 在 `AuthContext.tsx` 的 `logout()` 中新增 Firebase `signOut()` 呼叫

## 7. 重新建置與驗證

- [x] 7.1 重新建置 Docker image（`docker compose build`）
- [x] 7.2 啟動服務（`docker compose up -d`），確認所有容器狀態正常
- [ ] 7.3 驗證以真實 Google ID Token 呼叫 `POST /auth/firebase` 可回傳有效 JWT
- [x] 7.4 確認 `POST /auth/login` 和 `POST /auth/register` 回傳 404
- [ ] 7.5 確認受保護路由（例如 `GET /auth/me`）使用步驟 7.3 取得的 JWT 可正常運作
