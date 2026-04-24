## Why

Knodex 需要能部署至 GitHub Pages 做展示或個人用途，但 GitHub Pages 是純靜態服務，無法連接後端、資料庫或 Firebase。因此需要一個 feature toggle，在 build time 切換為「純閱讀器模式」，讓前端可以獨立運作，只提供 PDF 上傳與閱讀功能。

## What Changes

- 新增 `VITE_APP_MODE` 環境變數，`reader` 值代表 GitHub Pages 純閱讀器模式
- 在 reader 模式下，前端完全不呼叫後端 API，改為本機 `localStorage` / `IndexedDB` 儲存文件清單與閱讀進度
- 在 reader 模式下，PDF 直接在瀏覽器本地讀取（`URL.createObjectURL`），不上傳至 MinIO
- 所有需要後端的功能（畫線、標籤、RAG 問答、搜尋、Admin）在 reader 模式下隱藏或停用
- 新增 GitHub Actions workflow，在 push 到指定 branch 時自動 build reader 模式並部署至 GitHub Pages

## Capabilities

### New Capabilities

- `reader-mode-toggle`: 前端 feature toggle 機制，根據 `VITE_APP_MODE=reader` 在 build time 切換行為與路由
- `local-pdf-storage`: reader 模式下的本地 PDF 管理，使用 localStorage 儲存 metadata，`URL.createObjectURL` 提供閱讀 URL
- `github-pages-deploy`: GitHub Actions workflow，build reader 模式前端並 push 至 `gh-pages` branch

### Modified Capabilities

- `document-management`: reader 模式下上傳改為本地讀取，列表改為 localStorage，刪除改為清除本地記錄

## Impact

- `frontend/src/` — 新增 mode guard、條件式 routing、local storage service
- `frontend/.env.github-pages` — reader 模式 build 用的環境變數檔
- `.github/workflows/deploy-pages.yml` — 新增 GitHub Actions workflow
- 不影響現有生產部署（docker-compose、nginx）
