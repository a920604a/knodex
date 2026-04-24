## 1. 工具函式

- [x] 1.1 新增 `src/lib/concurrency.ts`：實作 `withConcurrency<T>(tasks, limit)` — 手寫 worker pool，不引入外部套件

## 2. 進度元件

- [x] 2.1 新增 `src/components/FolderUploadProgress.tsx`：接受 `items: UploadItem[]`、`onDismiss: () => void`
- [x] 2.2 元件顯示進度條（`doneCount + errorCount / total`）
- [x] 2.3 元件顯示每個檔案的狀態列表（✓ / ⏳ / ✗ + error message），超過 50 個只顯示前 20 + 「還有 N 個」
- [x] 2.4 完成時顯示摘要（成功 n、失敗 n、跳過 n），3 秒後自動 onDismiss
- [x] 2.5 `tokens.css` 新增 `.folder-upload-progress`（overlay / inline card 樣式）

## 3. DocumentListPage 整合

- [x] 3.1 新增 `folderRef = useRef<HTMLInputElement>(null)` 和 `<input webkitdirectory>` hidden input
- [x] 3.2 新增 `uploadItems: UploadItem[] | null` state（null = 未上傳，array = 進行中/完成）
- [x] 3.3 實作 `handleFolderUpload(e)`：
      - 取 `e.target.files`，過濾 PDF，計算 `skippedCount`
      - 無 PDF 時顯示提示，不進行上傳
      - 建立 `UploadItem[]` 初始狀態（全部 pending）
      - 用 `withConcurrency` 並行上傳，每個開始前設 `uploading`，完成後設 `done`/`error`
      - 全部完成後 `load()` 刷新書庫
- [x] 3.4 新增「上傳資料夾」按鈕（`btn btn--ghost`），`onClick` 觸發 `folderRef.current?.click()`
- [x] 3.5 `uploadItems` 非 null 時渲染 `<FolderUploadProgress>`，`onDismiss` 時重置 state

## 4. 驗收

- [ ] 4.1 選取含 PDF + 非 PDF 的資料夾：只有 PDF 上傳，非 PDF 計入跳過數
- [ ] 4.2 選取有子資料夾的資料夾：子資料夾內的 PDF 也上傳
- [ ] 4.3 確認同時最多 3 個 request（DevTools Network tab）
- [ ] 4.4 混合結果（含超過 100MB 的 PDF）：失敗項目顯示錯誤，其餘繼續
- [ ] 4.5 完成摘要顯示正確數字，3 秒後自動收起
- [x] 4.6 TypeScript 型別檢查通過（`npx tsc --noEmit`）
