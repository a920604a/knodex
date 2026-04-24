## ADDED Requirements

### Requirement: Folder Selection Button
書庫頁面 SHALL 在現有「+ 上傳 PDF」按鈕旁提供獨立的「上傳資料夾」按鈕，點擊後開啟系統資料夾選擇器（`webkitdirectory`）。

#### Scenario: Folder button opens directory picker
- **WHEN** user 點擊「上傳資料夾」按鈕
- **THEN** 系統開啟資料夾選擇對話框（不是單檔選擇）

---

### Requirement: Recursive PDF Filtering
系統 SHALL 遞迴掃描選取資料夾內所有檔案，僅保留副檔名為 `.pdf` 或 MIME type 為 `application/pdf` 的檔案。非 PDF 檔案 SHALL 被計入「跳過」數量，不觸發上傳。

#### Scenario: Mixed folder with PDFs and other files
- **WHEN** 資料夾含 10 個 PDF 和 5 個 .docx
- **THEN** 只有 10 個 PDF 進入上傳佇列，5 個計入跳過數

#### Scenario: Nested subdirectory PDFs included
- **WHEN** 資料夾有子資料夾，子資料夾內有 PDF
- **THEN** 子資料夾內的 PDF 也進入上傳佇列

#### Scenario: No PDFs in folder
- **WHEN** 資料夾內無任何 PDF 檔案
- **THEN** 不觸發任何上傳，顯示「資料夾中沒有 PDF 檔案」提示

---

### Requirement: Concurrent Upload with Progress
系統 SHALL 同時最多 3 個 PDF 並行上傳（concurrency=3），其餘排隊等待。上傳期間 SHALL 即時顯示：進度條（完成數 / 總數）、每個檔案的狀態（待上傳 / 上傳中 / 成功 / 失敗）。

#### Scenario: Upload progress updates in real-time
- **WHEN** 上傳進行中
- **THEN** 進度條百分比隨每個檔案完成而更新，檔案列表顯示每個檔案的當前狀態

#### Scenario: At most 3 concurrent requests
- **WHEN** 佇列中有 10 個 PDF 待上傳
- **THEN** 同一時間最多 3 個 HTTP 請求進行中

---

### Requirement: Per-File Error Handling
單一 PDF 上傳失敗（超過 100MB、quota 已滿、網路錯誤）SHALL 不中斷其餘檔案的上傳。失敗的檔案 SHALL 顯示錯誤原因。

#### Scenario: One file exceeds size limit
- **WHEN** 佇列中有一個超過 100MB 的 PDF
- **THEN** 該檔案標記為失敗並顯示錯誤訊息，其餘檔案繼續上傳

#### Scenario: Quota exceeded mid-batch
- **WHEN** 上傳到一半時 user quota 已滿（後端回傳 403）
- **THEN** 後續檔案標記為失敗（403），已上傳的檔案保留

---

### Requirement: Completion Summary
所有檔案上傳完成後，系統 SHALL 顯示摘要：成功數、失敗數（含原因）、跳過的非 PDF 數。摘要 SHALL 在 3 秒後自動收起，或 user 手動關閉。

#### Scenario: All uploads succeed
- **WHEN** 10 個 PDF 全部上傳成功
- **THEN** 顯示「上傳完成：10 個成功」，3 秒後收起，書庫列表刷新

#### Scenario: Mixed results
- **WHEN** 上傳 10 個 PDF，8 成功，1 失敗（超過 100MB），1 失敗（quota）
- **THEN** 摘要顯示「8 個成功，2 個失敗」，失敗項目各附原因
