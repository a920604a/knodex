## ADDED Requirements

### Requirement: 文件列表包含文件標籤資訊
系統 SHALL 在文件列表與文件詳情中回傳文件標籤資訊，供前端建立主題式瀏覽。

#### Scenario: 文件列表回傳文件標籤
- **WHEN** 使用者呼叫 `GET /documents`
- **THEN** 系統回傳陣列，每筆文件除既有摘要欄位外，還包含 `updated_at` 與 `document_tags`

#### Scenario: 文件詳情回傳文件標籤
- **WHEN** 使用者呼叫 `GET /documents/{id}`
- **THEN** 系統回傳完整文件欄位，且包含 `document_tags`

### Requirement: 文件列表支援依文件標籤篩選
系統 SHALL 允許以文件標籤縮小文件列表範圍，供前端依主題快速找書。

#### Scenario: 依文件標籤篩選文件
- **WHEN** 使用者呼叫 `GET /documents?document_tag_id=existing-uuid`
- **THEN** 系統只回傳掛載該文件標籤的文件

#### Scenario: 篩選不存在的文件標籤
- **WHEN** 使用者呼叫 `GET /documents?document_tag_id=missing-uuid`
- **THEN** 系統回傳 404 或空陣列，且行為在 API 文件中明確定義並保持一致

### Requirement: 文件庫顯示最近活動捷徑
系統 SHALL 在文件庫頁面顯示最近活動區塊，作為文件主題瀏覽之外的快捷入口。

#### Scenario: 顯示最近活動文件
- **WHEN** 文件庫頁面載入且系統內至少有一筆文件
- **THEN** 前端依 `updated_at` 由新到舊選出最近活動文件，顯示於頁面上方捷徑區

#### Scenario: 最近活動不改變主題分組
- **WHEN** 某份文件同時屬於最近活動與某個文件標籤分組
- **THEN** 該文件仍保留在其主題分組內，最近活動僅作為額外捷徑

### Requirement: 文件庫依文件標籤樹分組顯示
系統 SHALL 讓文件庫頁面依文件標籤樹顯示可折疊的主題分組，並提供未分類區塊。

#### Scenario: 顯示根主題分組
- **WHEN** 文件庫頁面載入且存在根文件標籤
- **THEN** 前端為每個根文件標籤顯示可展開的分組標題與文件數量

#### Scenario: 顯示子主題分組
- **WHEN** 某文件標籤含子標籤
- **THEN** 前端在父分組內遞迴顯示子分組，保留其階層關係

#### Scenario: 顯示未分類文件
- **WHEN** 某文件沒有任何文件標籤
- **THEN** 前端將該文件顯示於 `未分類` 分組

### Requirement: 文件卡片支援 inline 文件標籤管理
系統 SHALL 允許使用者直接在文件卡片上查看、掛載與移除文件標籤。

#### Scenario: 顯示文件現有標籤
- **WHEN** 文件卡片渲染時該文件已有文件標籤
- **THEN** 卡片顯示所有已掛載的文件標籤，且每個標籤可個別移除

#### Scenario: 從文件卡片新增文件標籤
- **WHEN** 使用者在文件卡片上選擇新增文件標籤
- **THEN** 前端呼叫文件標籤掛載 API，成功後更新該卡片與分組顯示

#### Scenario: 從文件卡片移除文件標籤
- **WHEN** 使用者在文件卡片上移除某個文件標籤
- **THEN** 前端呼叫文件標籤移除 API，成功後更新該卡片與分組顯示
