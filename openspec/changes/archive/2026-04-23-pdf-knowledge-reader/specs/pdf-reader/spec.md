## ADDED Requirements

### Requirement: 在瀏覽器中渲染 PDF
系統 SHALL 在前端以逐頁方式渲染 PDF，使用 react-pdf 元件。

#### Scenario: 開啟文件
- **WHEN** 使用者在文件列表點選某文件
- **THEN** 前端載入該文件的 PDF 二進位內容，以 react-pdf 渲染第一頁（或上次閱讀頁面）

#### Scenario: PDF 載入失敗
- **WHEN** PDF 檔案不存在或無法讀取
- **THEN** 前端顯示錯誤訊息「無法載入文件」，不崩潰

---

### Requirement: 翻頁與頁碼顯示
系統 SHALL 支援前進/後退翻頁操作，並即時顯示目前頁碼與總頁數。

#### Scenario: 前進翻頁
- **WHEN** 使用者點選「下一頁」或按右方向鍵
- **THEN** 顯示下一頁內容，頁碼更新

#### Scenario: 已到最後一頁
- **WHEN** 使用者在最後一頁點選「下一頁」
- **THEN** 按鈕禁用，頁碼不變

#### Scenario: 直接跳頁
- **WHEN** 使用者在頁碼輸入框輸入合法頁碼並確認
- **THEN** 系統跳至該頁並更新顯示

---

### Requirement: 追蹤並儲存閱讀頁碼
系統 SHALL 在使用者翻頁時，自動將目前頁碼同步至後端，更新閱讀進度。

#### Scenario: 翻頁觸發進度同步
- **WHEN** 使用者翻至新頁面，停留超過 2 秒
- **THEN** 前端呼叫 `POST /documents/{id}/progress`，提交目前頁碼與狀態 `"reading"`

#### Scenario: 閱讀完最後一頁
- **WHEN** 使用者到達最後一頁
- **THEN** 前端自動提交 `status: "done"`

---

### Requirement: 支援文字選取以建立畫線
系統 SHALL 允許使用者在 PDF 文字層選取文字，觸發建立畫線的 UI 流程。

#### Scenario: 選取文字後顯示畫線按鈕
- **WHEN** 使用者在 PDF 頁面選取一段文字
- **THEN** 畫面出現「新增畫線」浮動按鈕，包含選取的文字內容與起訖 offset

#### Scenario: 無文字層（掃描版 PDF）
- **WHEN** 使用者嘗試選取掃描版 PDF 的內容
- **THEN** 無文字可選，不觸發任何畫線 UI（靜默失敗，不報錯）
