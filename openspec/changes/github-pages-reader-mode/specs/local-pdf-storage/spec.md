## ADDED Requirements

### Requirement: Local PDF session storage
Reader mode SHALL 使用 `URL.createObjectURL(file)` 產生 blob URL 提供給 PDF viewer，不上傳任何資料至後端。

#### Scenario: User selects a PDF file
- **WHEN** 使用者在 reader mode 選取本地 PDF 檔案
- **THEN** 前端建立 blob URL，將 `{ id, title, size, addedAt }` 寫入 localStorage，並顯示於書庫列表

#### Scenario: User opens PDF viewer
- **WHEN** 使用者點擊書庫中的 PDF 項目
- **THEN** 若 blob URL 有效，PDF viewer 直接從 blob 渲染；若無效（重整後），顯示「重新載入」提示

### Requirement: Reader mode progress persistence
讀取進度 SHALL 以 localStorage 持久化，key 格式為 `reader-progress:{id}`，value 為 `{ page, progress, updatedAt }`。

#### Scenario: Progress saved on page change
- **WHEN** 使用者在 reader mode 翻頁（debounce 2s）
- **THEN** localStorage 的對應 progress record 更新，不發任何 HTTP 請求

### Requirement: Blob URL invalidation handling
當 blob URL 失效時（頁面重整後），書庫 SHALL 顯示「重新載入」狀態，並允許使用者重新選取同一 PDF 檔案以恢復閱讀。

#### Scenario: Page refresh invalidates blob URLs
- **WHEN** 使用者重整頁面後進入書庫
- **THEN** 書庫列表仍顯示 localStorage 中的 metadata，但每本書顯示「需重新載入」提示

#### Scenario: User reloads a PDF
- **WHEN** 使用者點擊「重新載入」並選取相同 PDF 檔案
- **THEN** 建立新 blob URL，恢復上次閱讀頁碼，繼續閱讀

### Requirement: Local document deletion
使用者 SHALL 可從書庫刪除本地 PDF 記錄（只刪除 metadata，blob URL 自動失效）。

#### Scenario: Delete local document
- **WHEN** 使用者在 reader mode 點擊刪除並確認
- **THEN** localStorage 中的 metadata 及 progress record 均被移除，書庫列表移除該項目
