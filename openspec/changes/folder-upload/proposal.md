## Why

目前只能單次選一個 PDF 上傳，無法批次匯入一整個資料夾。主任工程師確認今天要支援資料夾上傳，且只限 PDF 檔案（遞迴掃描子資料夾）。

## What Changes

- **新增「上傳資料夾」按鈕**（與現有單檔按鈕並列，分開兩個 `<input>`）
- **客戶端 PDF 過濾**：`webkitdirectory` 不支援 `accept` attribute，改以 JS 過濾 `.pdf` 副檔名，並統計跳過的非 PDF 數量
- **並行上傳（concurrency = 3）**：複用現有 `POST /documents`，不修改後端；同時最多 3 個 request，其餘排隊
- **即時進度 UI**：進度條（n/total）+ 每個檔案的狀態列表（✓ 成功 / ⏳ 進行中 / ✗ 失敗）
- **完成通知**：彈出摘要（成功 n 個、失敗 n 個＋原因、跳過 n 個非 PDF）
- **不修改後端**：每個 PDF 仍走 `POST /documents`，保留現有的 100MB 限制、quota 驗證、ingestion 流程

## Capabilities

### New Capabilities
- `folder-upload`: 選取資料夾，遞迴過濾 PDF，並行上傳，即時進度回饋

### Modified Capabilities
- （無 spec-level 變更）

## Impact

**前端（唯一改動範圍）：**
- `DocumentListPage.tsx` — 新增 folder input ref、上傳狀態 state、`handleFolderUpload` handler
- `FolderUploadProgress.tsx`（新元件）— 進度條 + 檔案狀態列表 + 完成摘要 overlay
- `tokens.css` — progress overlay 樣式
- `src/lib/concurrency.ts`（新工具）— `withConcurrency<T>(tasks, limit)` 泛型並行控制器

**後端：無任何改動。**
