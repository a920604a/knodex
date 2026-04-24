## ADDED Requirements

### Requirement: GitHub Actions deploy workflow
專案 SHALL 提供 `.github/workflows/deploy-pages.yml`，在 push 到 `gh-pages-build` branch 或手動觸發（`workflow_dispatch`）時，自動 build reader mode 前端並部署至 `gh-pages` branch。

#### Scenario: Push to gh-pages-build triggers deploy
- **WHEN** 有 commit push 至 `gh-pages-build` branch
- **THEN** GitHub Actions 執行 build 並將 `dist/` 部署至 `gh-pages` branch

#### Scenario: Manual workflow dispatch
- **WHEN** 使用者在 GitHub Actions 頁面手動觸發 workflow
- **THEN** 同樣執行 build 與部署

### Requirement: Reader mode build config file
專案 SHALL 提供 `frontend/.env.github-pages`，包含 reader mode build 所需的環境變數（`VITE_APP_MODE=reader`、`VITE_BASE_PATH`）。此檔案 SHALL 可 commit 至 git（不含 secrets）。

#### Scenario: Build uses github-pages env file
- **WHEN** GitHub Actions 執行 `vite build --mode github-pages`
- **THEN** Vite 載入 `.env.github-pages`，build 產出為 reader mode，base path 正確

### Requirement: SPA fallback for GitHub Pages
由於 GitHub Pages 不支援 server-side routing，SHALL 在 `dist/` 目錄加入 `404.html`（內容與 `index.html` 相同）以支援直接連結進入子路由。

#### Scenario: Direct URL access to reader route
- **WHEN** 使用者直接打開 `https://<user>.github.io/Knodex/reader/abc`
- **THEN** GitHub Pages 回傳 404.html，React Router 正常接管路由，頁面正常渲染
