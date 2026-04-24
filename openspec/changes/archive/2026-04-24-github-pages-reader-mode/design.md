## Context

Knodex 現有前端完全依賴後端 API（FastAPI + PostgreSQL + MinIO）。要部署到 GitHub Pages 就需要一個 build-time feature toggle，讓同一份原始碼可以產出兩種不同的 build：

- **full mode**（預設）：完整功能，需要後端
- **reader mode**（`VITE_APP_MODE=reader`）：純閱讀器，無後端依賴，PDF 存在瀏覽器本地

Vite 原生支援在 build time 透過 `import.meta.env` 注入環境變數，所以 tree-shaking 可以在 reader mode build 中完全移除後端相關程式碼。

## Goals / Non-Goals

**Goals:**
- 單一 codebase，不同環境變數產出不同 build
- Reader mode 不發任何後端 HTTP 請求
- Reader mode 可上傳本地 PDF、閱讀、記錄進度（localStorage）
- GitHub Actions 自動 build + deploy 至 `gh-pages` branch
- 不影響現有生產 docker-compose 部署

**Non-Goals:**
- Reader mode 不支援畫線、標籤、RAG 問答、搜尋、Admin
- 不支援跨裝置同步（reader mode 是純本機）
- 不引入 Service Worker 或 PWA 能力

## Decisions

### 1. Build-time toggle 而非 runtime toggle

使用 `VITE_APP_MODE=reader` 作為 build-time 常數，讓 Vite 在 tree-shake 時移除 full-mode 分支。

**替代方案**：runtime feature flag（環境檢測 URL、window 變數）  
**拒絕原因**：runtime 方式無法 tree-shake，reader build 仍會打包後端 API 程式碼

### 2. 以 `isReaderMode` 常數集中控制

```ts
// src/lib/mode.ts
export const isReaderMode = import.meta.env.VITE_APP_MODE === "reader";
```

所有條件判斷統一引用此常數。Router、Sidebar、上傳元件等各自用 `isReaderMode` 做條件渲染或分支，不需要 Context。

### 3. PDF 儲存：`URL.createObjectURL` + localStorage metadata

Reader mode 不上傳到 MinIO。使用者選取 PDF 後：
- `URL.createObjectURL(file)` 產生 blob URL 供 PDF viewer 直接使用
- localStorage 儲存 metadata（id, title, size, addedAt, progress）
- 重整後 blob URL 失效，metadata 仍在，但 PDF 內容消失 → 需提示使用者重新載入

**替代方案**：IndexedDB 儲存 PDF 二進位  
**拒絕原因**：大型 PDF 可能超過 quota，且實作複雜度高；MVP 先做 session-based，列清單讓使用者重新選取即可

### 4. 閱讀進度：localStorage

key 格式：`reader-progress:{title}` → `{ page, progress, updatedAt }`

### 5. Reader mode routing

移除後端相關路由：`/query`、`/search`、`/tags`、`/admin`。  
僅保留：`/`（書庫）、`/reader/:localId`。

Sidebar 在 reader mode 隱藏後端功能 nav 項目。

### 6. GitHub Actions deploy

觸發條件：push 到 `gh-pages-build` branch（或 workflow_dispatch）。  
Build 步驟：
1. `npm ci`
2. `VITE_APP_MODE=reader npm run build`
3. `peaceiris/actions-gh-pages` deploy `dist/` 到 `gh-pages` branch

Vite base 設定：需加 `base: "/Knodex/"` 對應 GitHub Pages 子路徑。透過 `VITE_BASE_PATH` 環境變數注入，reader mode build 使用此值，full mode 預設 `/`。

## Risks / Trade-offs

- **Blob URL 失效**：使用者重整頁面後，現有 blob URL 失效，PDF viewer 會 404。→ Mitigation：顯示「重新載入此 PDF」按鈕，讓使用者重新選取檔案
- **localStorage 5MB 限制**：只存 metadata，不存 PDF binary，此 risk 可接受
- **base path 問題**：GitHub Pages 預設在 `/Knodex/` 子路徑，React Router 需設定 `basename`，Vite 需設定 `base`。→ Mitigation：均從 `VITE_BASE_PATH` 讀取

## Open Questions

- 是否需要支援 reader mode 下的多 tab（同時開多個 PDF）？→ 先不支援，一次一本
- gh-pages deploy 的 repository 是否與主專案相同？→ 假設是同一 repo 的 `gh-pages` branch
