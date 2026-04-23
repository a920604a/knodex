# User Flow

## 0. 啟動程序

```
後端啟動
  → alembic upgrade head（自動建表 / schema 更新）
  → MinIO ensure_bucket（確保 bucket 存在）
  → [背景] sync_minio_to_db()
      → 列出 MinIO bucket 內全部物件
      → 比對 DB 已有的 file_path
      → 對差集（MinIO 有、DB 沒有）自動建立 Document 記錄
      → 記錄 log（新增筆數 / 總數）
  → HTTP server 開始接受請求（sync 在背景繼續執行）
```

---

## 1. 上傳 PDF

```
使用者
  → 點擊「+ 上傳 PDF」按鈕
  → 選取本地 PDF 檔案
  → [前端] 驗證 MIME type = application/pdf
  → POST /documents（multipart）
  → [後端] 驗證大小 ≤ 100MB
  → 上傳至 MinIO（key 格式：{uuid}_{原始檔名}）
  → 資料庫建立文件記錄（status: unread, progress: 0）
  → 前端文件列表即時刷新，顯示新文件
  → [背景] 自動觸發 PDF 解析（使用者無感知）
       → 從 MinIO 下載 PDF → 擷取每頁文字 → 分塊 → 存入 document_chunks
       → 更新 total_pages
```

**錯誤情境：**
- 非 PDF 檔案 → 後端回傳 400，前端不更新列表
- 超過 100MB → 後端回傳 413

---

## 2. 閱讀 PDF

```
使用者
  → 在文件列表點擊文件
  → 進入閱讀器頁面（/reader/:id）
  → [前端] GET /documents/{id}（取得 metadata）
  → [前端] GET /documents/{id}/file（從 MinIO 串流 PDF bytes → react-pdf 渲染）
  → 從上次閱讀頁面開始（或第一頁）

翻頁：
  → 點擊「下頁」或鍵盤方向鍵
  → 頁碼更新，react-pdf 渲染新頁
  → [debounce 2s] POST /documents/{id}/progress { page, status: "reading" }
  → 到達最後一頁 → 自動送出 status: "done"，progress: 1.0

直接跳頁：
  → 輸入頁碼 → Enter
  → 跳至指定頁，同樣觸發進度同步
```

---

## 3. 建立畫線

```
使用者
  → 在 PDF 文字層拖曳選取文字
  → 放開滑鼠（onMouseUp）
  → [前端] 擷取選取內容：text, page, start_offset, end_offset
  → 畫面浮現「新增畫線」按鈕 / Modal 自動開啟
  → 使用者（選填）輸入筆記
  → 使用者（選填）點選標籤 chip
  → 點擊「建立」
  → POST /highlights { document_id, text, note, page, start_offset, end_offset }
  → [若有選標籤] POST /highlights/{id}/tags { tag_ids }
  → 右側畫線側欄即時刷新，顯示新畫線
```

**邊界情境：**
- 掃描版 PDF（無文字層）→ 無法選取，不觸發任何動作

---

## 4. 管理畫線筆記

```
使用者
  → 在右側畫線側欄找到目標畫線
  → 點擊「編輯」
  → inline 輸入框出現，顯示現有筆記
  → 修改內容 → 點擊「儲存」
  → PATCH /highlights/{id} { note }
  → 畫線卡片即時更新

刪除畫線：
  → 點擊「刪除」
  → DELETE /highlights/{id}
  → 側欄移除該畫線卡片
```

---

## 5. 刪除文件

```
使用者
  → 在文件列表點擊刪除
  → DELETE /documents/{id}
  → [後端] 刪除 MinIO 上的 PDF 檔案
  → [後端] 刪除 DB 記錄（cascades：highlights, chunks）
  → 前端文件列表移除該項目
```

---

## 6. 管理標籤

```
進入標籤管理頁（/tags）

建立標籤：
  → 輸入標籤名稱 → Enter 或點「新增」
  → POST /tags { name }（根標籤）
  → 標籤樹立即更新

建立子標籤：
  → 選擇父標籤 → 輸入名稱 → 新增
  → POST /tags { name, parent_id }

刪除標籤（無子節點）：
  → 點擊 ✕
  → DELETE /tags/{id}
  → 同層級的畫線標籤關聯自動移除

刪除標籤（有子節點）：
  → 點擊 ✕
  → 系統彈出確認「此標籤含子標籤，是否一併刪除？」
  → 確認 → DELETE /tags/{id}?cascade=true
  → 遞迴刪除所有子標籤
```

---

## 7. 搜尋

```
全域搜尋（/search 頁面）：
  → 輸入關鍵字 → Enter 或點「搜尋」
  → GET /search?q=keyword
  → 顯示兩個分類結果：
      「文件」區塊：title 含關鍵字的文件
      「畫線」區塊：text 或 note 含關鍵字的畫線
  → 點擊文件 → 跳至閱讀器
  → 點擊畫線 → 跳至該文件閱讀器

閱讀器內即時篩選：
  → 在 Header 輸入關鍵字 → GET /highlights?document_id=&q=keyword
  → 輸入標籤名稱 → GET /highlights?document_id=&tag=tagname
  → 兩者同時輸入 → AND 條件組合查詢
  → 右側畫線側欄即時更新
```

---

## 8. 重新解析 PDF

```
（當 PDF 解析失敗或 total_pages 未更新時）

  → POST /documents/{id}/reprocess
  → 後端觸發 BackgroundTask
  → 從 MinIO 重新下載 PDF
  → 刪除舊 document_chunks → 重新擷取 → 重新分塊 → 寫入新 chunks
  → 更新 total_pages
```

---

## 頁面路由總覽

| 路由 | 頁面 | 主要功能 |
|------|------|---------|
| `/` | DocumentListPage | 文件列表、上傳 PDF |
| `/reader/:id` | ReaderPage | PDF 閱讀、建立畫線、畫線側欄 |
| `/search` | SearchPage | 全域搜尋文件與畫線 |
| `/tags` | TagManager | 標籤樹管理 |
