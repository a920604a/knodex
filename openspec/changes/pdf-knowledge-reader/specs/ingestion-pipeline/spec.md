## ADDED Requirements

### Requirement: 上傳後自動觸發 PDF 解析
系統 SHALL 在 PDF 上傳成功後，自動以非同步方式啟動文字擷取與分塊流程。

#### Scenario: 上傳後觸發背景任務
- **WHEN** `POST /documents` 成功儲存 PDF 檔案
- **THEN** API 立即回傳 201（不等待解析完成），並在背景啟動 ingestion 任務

#### Scenario: Ingestion 完成後更新狀態
- **WHEN** 背景任務完成文字擷取與分塊
- **THEN** 系統將 `documents.total_pages` 更新為實際頁數

---

### Requirement: PDF 文字擷取
系統 SHALL 使用 PyMuPDF（fitz）從 PDF 提取每頁純文字。

#### Scenario: 成功擷取文字
- **WHEN** Ingestion worker 處理可選取文字的 PDF
- **THEN** 每頁文字被擷取並清理（移除多餘空白行、控制字元）

#### Scenario: 掃描版 PDF（無文字層）
- **WHEN** Ingestion worker 處理掃描版 PDF（無文字層）
- **THEN** Worker 記錄警告，跳過分塊，不建立任何 `document_chunks`，不報錯

---

### Requirement: 文字分塊（Chunking）
系統 SHALL 將擷取的文字切分為固定大小的 chunk，儲存至 `document_chunks`。

#### Scenario: 正常文件分塊
- **WHEN** 文字擷取完成，總 token 數超過 500
- **THEN** 系統以 500 token 為單位、100 token overlap 進行分塊，每個 chunk 記錄 `chunk_index`、`page`、`content`

#### Scenario: 短文件不需分塊
- **WHEN** 文字總 token 數不超過 500
- **THEN** 系統建立單一 chunk（`chunk_index: 0`），包含全部文字

#### Scenario: 冪等處理（重複上傳）
- **WHEN** 同一 `document_id` 的 ingestion 任務再次執行
- **THEN** 系統先刪除該文件所有舊 `document_chunks`，再重新建立，不產生重複資料

---

### Requirement: Ingestion 失敗重試
系統 SHALL 在 ingestion 任務失敗時，記錄錯誤資訊並支援手動重新觸發。

#### Scenario: 任務執行失敗
- **WHEN** Ingestion 過程中發生例外（如檔案損毀、記憶體不足）
- **THEN** 系統記錄錯誤至 log，不影響 API 服務正常運行

#### Scenario: 手動重新觸發
- **WHEN** 使用者呼叫 `POST /documents/{id}/reprocess`
- **THEN** 系統重新啟動該文件的 ingestion 任務（先清除舊 chunks）
