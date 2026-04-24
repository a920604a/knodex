## 1. 基礎設定

- [x] 1.1 新增 `frontend/src/lib/mode.ts`：export `isReaderMode = import.meta.env.VITE_APP_MODE === "reader"`
- [x] 1.2 新增 `frontend/.env.github-pages`：`VITE_APP_MODE=reader`、`VITE_BASE_PATH=/Knodex/`
- [x] 1.3 修改 `frontend/vite.config.ts`：讀取 `VITE_BASE_PATH` 作為 `base`（預設 `/`）

## 2. 本地 PDF 儲存服務

- [x] 2.1 新增 `frontend/src/lib/localDocs.ts`：localStorage CRUD（`addDoc`, `listDocs`, `deleteDoc`, `saveProgress`, `getProgress`）
- [x] 2.2 `addDoc` 建立 UUID、寫入 `{ id, title, size, addedAt, blobUrl }`，並管理 blob URL lifecycle
- [x] 2.3 `saveProgress` / `getProgress`：key `reader-progress:{id}` → `{ page, progress, updatedAt }`

## 3. Router 與 Sidebar

- [x] 3.1 修改 `frontend/src/App.tsx`：`isReaderMode` 時只 render `/` 和 `/reader/:localId`，其餘路由 redirect 至 `/`
- [x] 3.2 修改 `frontend/src/App.tsx`：從 `VITE_BASE_PATH` 設定 `BrowserRouter` 的 `basename`
- [x] 3.3 修改 `frontend/src/components/Sidebar.tsx`：`isReaderMode` 時隱藏搜尋、RAG 問答、知識標籤、Admin nav 項目

## 4. DocumentListPage（書庫頁）

- [x] 4.1 修改 `DocumentListPage`：`isReaderMode` 時從 `localDocs.listDocs()` 讀取列表，不呼叫 `GET /documents`
- [x] 4.2 修改上傳按鈕邏輯：`isReaderMode` 時 `onChange` 呼叫 `localDocs.addDoc(file)` 而非 `uploadDocument(file)`
- [x] 4.3 修改刪除邏輯：`isReaderMode` 時呼叫 `localDocs.deleteDoc(id)` 而非 `deleteDocument(id)`
- [x] 4.4 Reader mode 隱藏：「上傳資料夾」按鈕、書目標籤 TopicDropdown（書卡上）
- [x] 4.5 書庫卡片顯示「需重新載入」狀態（`blobUrl` 失效時），提供重新選取檔案按鈕

## 5. ReaderPage（閱讀器頁）

- [x] 5.1 修改 `ReaderPage`：`isReaderMode` 時從 `localDocs.listDocs()` 取得 blobUrl，不呼叫 `GET /documents/{id}/file-url`
- [x] 5.2 修改進度同步：`isReaderMode` 時呼叫 `localDocs.saveProgress(id, page, progress)` 而非 `POST /documents/{id}/progress`
- [x] 5.3 Reader mode 隱藏：HighlightSidebar（右側畫線側欄）、畫線相關 UI

## 6. GitHub Actions

- [x] 6.1 新增 `.github/workflows/deploy-pages.yml`：trigger on push to `gh-pages-build` + `workflow_dispatch`
- [x] 6.2 Workflow build 步驟：`npm ci` → `npm run build -- --mode github-pages`
- [x] 6.3 Workflow deploy 步驟：使用 `peaceiris/actions-gh-pages` 部署 `frontend/dist/` 至 `gh-pages` branch
- [x] 6.4 Build 後複製 `dist/index.html` 為 `dist/404.html`（SPA fallback for GitHub Pages）

## 7. 驗收

- [x] 7.1 `VITE_APP_MODE=reader npm run build` 成功，`dist/` 不含後端 API 呼叫
- [ ] 7.2 本地 `vite preview` 模擬 reader mode：上傳 PDF → 顯示於書庫 → 點擊閱讀
- [ ] 7.3 重整頁面後書庫列表仍在（localStorage），顯示「需重新載入」提示
- [ ] 7.4 重新載入 PDF 後可從上次頁碼繼續閱讀
- [ ] 7.5 Full mode build 不受影響（`npm run build` 無 `VITE_APP_MODE` 時行為不變）
- [x] 7.6 TypeScript 型別檢查通過（`npx tsc --noEmit`）
