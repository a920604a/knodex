## 1. Data Model And Persistence

- [ ] 1.1 新增 `document_tags` 與 `document_tag_links` SQLAlchemy models 與 Alembic migration
- [ ] 1.2 為 `Document` 建立文件標籤 relationship，並保持既有 highlight 關聯不變
- [ ] 1.3 撰寫 migration / model 測試，確認文件標籤樹與文件關聯可正確建立與刪除

## 2. Backend APIs

- [ ] 2.1 新增 `document-tags` router、schema、service，支援建立、列表、樹狀查詢與刪除
- [ ] 2.2 擴充 `GET /documents` 與 `GET /documents/{id}`，回傳 `updated_at` 與 `document_tags`
- [ ] 2.3 為 `GET /documents` 加入 `document_tag_id` 篩選參數
- [ ] 2.4 新增 `POST /documents/{id}/tags` 與 `DELETE /documents/{id}/tags/{tag_id}` 文件標籤掛載 API
- [ ] 2.5 撰寫後端測試，覆蓋文件標籤 CRUD、文件篩選、冪等掛載與 cascade 刪除

## 3. Frontend Library Organization

- [ ] 3.1 更新前端 `Document` / `DocumentTag` types 與 API client
- [ ] 3.2 在文件列表頁載入文件標籤樹與文件列表，建立最近活動與主題樹分組的前端組裝邏輯
- [ ] 3.3 重構 `DocumentListPage`，加入最近活動捷徑、可折疊主題分組與未分類區塊
- [ ] 3.4 在文件卡片加入 inline 文件標籤顯示、掛載與移除互動

## 4. Verification

- [ ] 4.1 驗證文件可出現在最近活動與主題分組兩處，且點擊皆可開啟閱讀器
- [ ] 4.2 驗證文件卡片掛載或移除標籤後，最近活動與主題分組會即時更新
- [ ] 4.3 驗證 highlight tags 既有 API 與 UI 不受 document tags 變更影響
