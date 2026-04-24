# User Flow

## 0. 登入

```
使用者進入任意頁面
  → AuthContext 偵測未登入 → 跳轉至 /auth
  → AuthPage 顯示「以 Google 帳戶繼續」
  → Firebase signInWithPopup（Google OAuth）
  → 取得 Firebase ID Token
  → POST /auth/firebase { id_token }
  → 後端 firebase-admin 驗證 → upsert User
  → 回傳自簽 JWT（7 天有效）
  → 前端儲存 JWT → 導回原頁面

登出：
  → 點擊 Sidebar 底部「登出」
  → Firebase signOut() + 清除本地 JWT → /auth
```

---

## 1. 後端啟動程序

```
後端啟動
  → alembic upgrade head（自動建表 / schema 更新）
  → storage.ensure_bucket()（確保 MinIO bucket 存在）
  → ensure_default_tags()（建立預設書目標籤，冪等）
  → [背景] sync_minio_to_db()
      → 列出 MinIO bucket 內全部 .pdf 物件
      → 比對 DB 已有的 file_path
      → 差集（MinIO 有、DB 沒有）→ INSERT Document 記錄
  → arq_pool 連線 Redis
  → HTTP server 開始接受請求
```

---

## 2. 上傳單一 PDF

```
使用者
  → 點擊「+ 上傳 PDF」
  → 選取本地 PDF 檔案（最大 100MB）
  → POST /documents（multipart）
  → [後端] 檢查 MIME type = application/pdf，大小 ≤ 100MB
  → 查詢是否超過 pdf_limit（預設 10）
  → 查 DB：同一 user_id 是否已有同名 title
      → 若有 → 409（前端不更新列表）
  → 上傳至 MinIO（key = {uuid4}_{原始檔名}）
  → INSERT documents（ingestion_status=pending）
  → enqueue_job("ingest_document", doc_id)
  → 前端文件列表刷新，顯示新文件

[Worker] ingest_document（非同步，見 Ingestion Pipeline）
```

**錯誤情境：**
- 非 PDF → 400
- 超過 100MB → 413
- 已達上限 → 403
- 相同標題已存在 → 409（前端標記 skipped）

---

## 3. 資料夾批次上傳

```
使用者
  → 點擊「上傳資料夾」
  → 選取資料夾（含子資料夾）
  → [前端] 過濾非 PDF 檔案，計入 skippedCount
  → 若無 PDF → alert，結束
  → 比對現有書目 title Set，預先標記重複者為 skipped
  → 顯示 FolderUploadProgress（進度條 + 每檔狀態）
  → withConcurrency(tasks, 3)：最多 3 個並行上傳
      → 每個開始前：status = uploading
      → 上傳成功：status = done
      → 409（重複）：status = skipped
      → 其他錯誤：status = error（顯示錯誤訊息）
  → 全部完成後 → 刷新書庫
  → 3 秒後 FolderUploadProgress 自動收起

保護機制：上傳中若關閉頁面 → beforeunload 事件彈出確認框
```

---

## 4. Ingestion Pipeline（背景 Worker）

```
[Worker: ingest_document]
  Phase 1: 從 MinIO 下載 PDF bytes
  Phase 2: Thumbnail
    → PyMuPDF 第一頁 → JPEG（0.37x scale）
    → 上傳至 MinIO（{doc_id}_thumb.jpg）
    → UPDATE documents.thumb_path（立即 commit）
  Phase 3: Text Extraction
    → 逐頁 fitz.get_text() + clean_text()
    → 若無文字層（掃描版）→ 記錄 warning，跳至 Finalize
  Phase 4: Chunking
    → tiktoken.encode → chunk(size=500, overlap=100)
    → 清除舊 document_chunks → INSERT 新的
  Phase 5: Embedding（每個 chunk）
    → Cloudflare Workers AI embed（@cf/baai/bge-small-en-v1.5）
    → Cloudflare Vectorize upsert（批次 20）
       metadata：user_id, document_id, source_type=chunk, page, content
  Finalize: UPDATE total_pages, ingestion_status=completed
```

---

## 5. 書庫瀏覽（DocumentListPage）

```
進入 / 首頁
  → GET /documents → 顯示書庫

HeroShelf（最近閱讀）
  → 顯示最近更新的 5 本書（封面縮圖 + 標題）
  → 點擊 → 進入閱讀器

TopicBar（橫向篩選）
  → GET /document-tags/tree → 顯示所有書目標籤
  → 點擊標籤 → 篩選下方書目網格
  → 「未歸類」選項 → 顯示無標籤的書

書目網格（LibraryCard）
  → 封面縮圖 / 預設圖示、標題、ingestion 狀態
  → 點擊書卡 → 進入閱讀器
  → 標籤按鈕 → TopicDropdown 勾選 / 取消書目標籤
  → 刪除按鈕 → 確認後 DELETE /documents/{id}
```

---

## 6. 閱讀 PDF

```
點擊書卡
  → 進入 /reader/:id
  → GET /documents/{id}（metadata）
  → GET /documents/{id}/file-url → presigned URL（1 小時有效）
  → @react-pdf-viewer 直接從 MinIO Range 串流
  → 從上次閱讀頁面開始

翻頁：
  → 頁碼更新
  → [debounce 2s] POST /documents/{id}/progress { page, status: "reading" }
  → 到達最後一頁 → status: "done", progress: 1.0

直接跳頁：
  → 輸入頁碼 → Enter → 同樣觸發進度同步
```

---

## 7. 建立畫線

```
在 PDF 文字層拖曳選取文字
  → onMouseUp → 擷取 text, page, start_offset, end_offset
  → HighlightModal 彈出
  → 使用者（選填）輸入筆記
  → 使用者（選填）點選知識標籤 chip
  → 點擊「建立」
  → POST /highlights { document_id, text, note, page, start_offset, end_offset }
  → [若有選標籤] POST /highlights/{id}/tags { tag_ids }
  → 右側畫線側欄即時刷新
  → [背景] enqueue_job("embed_highlight", highlight_id)
      → cf_ai.embed(text) → cf_vectorize.upsert
      → UPDATE highlights.embed_status = "done"
```

---

## 8. 管理畫線筆記

```
在右側畫線側欄找到目標畫線
  → 點擊「編輯」
  → inline 輸入框，修改筆記 → 點擊「儲存」
  → PATCH /highlights/{id} { note }

刪除畫線：
  → 點擊「刪除」→ DELETE /highlights/{id}
```

---

## 9. RAG 問答（QueryPage）

```
進入 /query
  → 輸入自然語言問題 → 點擊「提問」
  → POST /query { query }
  → [後端] 檢查 daily_query_limit（預設每日 20 次）
  → cf_ai.embed(query)
  → cf_vectorize.query(vector, filter={user_id}, top_k=5)
  → 組合 context（chunks + highlights）
  → cf_ai.generate(prompt)（@cf/meta/llama-3.1-8b-instruct）
  → INSERT query_logs
  → 顯示 answer + sources（type, document, page, 內容片段）
  → 點擊 source → 跳至對應文件閱讀器
```

若無相關向量結果：回傳「目前知識庫沒有相關資料。」

---

## 10. 管理知識標籤（/tags）

```
建立標籤：
  → 輸入名稱 → POST /tags { name }（根標籤）

建立子標籤：
  → 選擇父標籤 → POST /tags { name, parent_id }

刪除無子節點標籤：
  → ✕ → DELETE /tags/{id}

刪除有子節點標籤：
  → 確認「是否一併刪除？」→ DELETE /tags/{id}?cascade=true
```

---

## 11. 管理書目標籤（DocumentListPage）

書目標籤用於書庫分類，與知識標籤（highlight tags）完全獨立。

```
在 LibraryCard 點擊「標籤」按鈕
  → TopicDropdown 顯示所有書目標籤
  → 勾選 → POST /documents/{id}/tags { tag_id }
  → 取消勾選 → DELETE /documents/{id}/tags/{tag_id}
  → TopicBar 計數即時更新
```

---

## 12. 全文搜尋（/search）

```
輸入關鍵字 → Enter
  → GET /search?q=keyword
  → 顯示兩個分類：
      「文件」：title 含關鍵字
      「畫線」：text 或 note 含關鍵字
  → 點擊項目 → 跳至對應閱讀器
```

閱讀器內即時篩選：

```
Header 輸入關鍵字 → GET /highlights?document_id=&q=keyword
Header 輸入標籤名 → GET /highlights?document_id=&tag=tagname
兩者同時 → AND 條件
```

---

## 13. 管理後台（/admin，僅 admin 角色）

```
進入 /admin
  → GET /admin/users → 顯示所有使用者
      欄位：email, role, pdf_count, today_query_count, pdf_limit, daily_query_limit
  → 點擊「編輯」→ PATCH /admin/users/{id}
      可調整 pdf_limit, daily_query_limit
  → GET /admin/stats → 顯示系統統計
      total_users, total_documents, today_total_queries, worker_queue_depth
```

---

## 14. 重新解析 PDF

```
（當 ingestion_status=failed 或 total_pages 未更新）

  → POST /documents/{id}/reprocess
  → 後端 enqueue_job("ingest_document", doc_id)
  → Worker 重新執行完整 ingestion pipeline
```

---

## 頁面路由總覽

| 路由 | 頁面 | 主要功能 |
|------|------|---------|
| `/auth` | AuthPage | Google 登入 |
| `/` | DocumentListPage | 書庫（HeroShelf + TopicBar + 網格）、上傳 |
| `/reader/:id` | ReaderPage | PDF 閱讀、畫線、畫線側欄 |
| `/query` | QueryPage | RAG 自然語言問答 |
| `/search` | SearchPage | 全文搜尋 |
| `/tags` | TagManager | 知識標籤樹管理 |
| `/admin` | AdminPage | 使用者管理（admin only） |
