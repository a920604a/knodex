## Context

目前書庫頁面受 `.page-content { max-width: 720px }` 限制，所有頁面共用同一寬度約束，書目以垂直清單呈現，無封面圖，分類 filter 佔用左側 160px 固定欄。預期書目規模：最多 100 本／user，5–10 位用戶。後端已有 PyMuPDF（fitz）用於 ingestion，MinIO 已是 PDF 儲存來源。

## Goals / Non-Goals

**Goals:**
- 書庫頁面改為響應式封面 Grid，充分利用寬螢幕空間
- 縮圖在 ingestion 階段自動產生，不需額外手動操作
- 橫向 filter bar 取代左側 topic-rail
- 全站移除硬式 720px 限制，各頁面自行定義寬度行為
- 舊書目（無縮圖）有 fallback cover，不影響現有資料

**Non-Goals:**
- 不實作 list / grid 視圖切換（只做 grid）
- 不實作縮圖手動重新生成 API
- 不實作縮圖的 CDN 或 cache-control 最佳化
- 不改動 Reader、QueryPage 以外的頁面 layout 邏輯

## Decisions

### D1：縮圖生成時機 — ingestion 時同步生成，不另起 worker

**選項：**
- A. ingestion BackgroundTask 同步生成（選擇）
- B. 另起獨立縮圖 worker queue

**理由：** 現有 ingestion 已是 BackgroundTask，加一步生成縮圖不影響 API 回應時間；規模（100 本）不需要 queue infrastructure。縮圖生成失敗僅影響封面顯示，不影響 ingestion 本身（try/except 包住，失敗記 warning log，`thumb_path` 維持 NULL）。

---

### D2：縮圖尺寸 — 180×240px JPEG

**選項：**
- A. 180×240px, quality=85（選擇）
- B. 260×340px（@2x retina）

**理由：** 180×240 已足夠 grid card 顯示，JPEG q85 下約 15–25 KB／張，100 本 ≈ 2.5 MB 總儲存量。Retina 螢幕透過 CSS `object-fit: cover` 縮放即可，不值得為此多存 @2x。

PyMuPDF render 設定：
```
mat = fitz.Matrix(0.37, 0.37)  # A4 @ 72dpi → ~180px 寬
pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
```

---

### D3：縮圖 API — 與 PDF file-url 同型（presigned URL）

**選項：**
- A. `GET /documents/{id}/thumb-url` → `{ url: presigned }` （選擇）
- B. 後端 proxy 直接回傳圖片 bytes

**理由：** 與現有 `file-url` 模式一致，前端邏輯統一。MinIO presigned URL 1 小時有效，對縮圖載入夠用。

---

### D4：Grid 響應式欄數 — CSS `auto-fill` + `minmax`

不硬寫斷點欄數，改用：
```css
grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
```

行為：
```
螢幕寬（扣除 sidebar）   欄數（約）
> 1200px                 6–7
900–1200px               5–6
600–900px                3–4
< 600px                  2（min 160px）
```

各斷點輔以 `@media` 調整 card padding / gap，不調整欄數（讓 auto-fill 處理）。

---

### D5：全站寬度修正 — page-content 移除 max-width，改為 padding-only

```css
/* before */
.page-content { max-width: 720px; margin: 0 auto; padding: var(--space-lg); }

/* after */
.page-content { padding: var(--space-lg) var(--space-xl); }

/* prose layout（未來文章頁使用）*/
.page-content--prose { max-width: 720px; margin: 0 auto; }
```

QueryPage、TagManager 直接獲益，無需額外改動。

---

### D6：HeroShelf 縮圖整合 — 優先用 thumb presigned URL，fallback 色塊

縮圖 URL 需要 API call（帶 JWT），HeroShelf 目前只收 `docs: Document[]`，不做 API call。

方案：在 `DocumentListPage` 載入時，批次 fetch 所有 `thumb-url`，存入 `thumbUrls: Map<string, string>` state，傳給 HeroShelf 與 LibraryCard。

批次策略：`Promise.allSettled`，失敗的項目保持 fallback。

## Risks / Trade-offs

**[Risk] 舊書目無縮圖** → `thumb_path` 為 nullable，前端 fallback 顯示首字母漸層色塊，無視覺破損。

**[Risk] Ingestion 縮圖失敗（損毀 PDF、掃描版等）** → try/except 包住縮圖步驟，失敗只記 warning log，不影響 `ingestion_status`。

**[Risk] 批次 fetch thumb-url 在 100 本書時發出 100 個 HTTP 請求** → 可接受（5–10 用戶規模）。若未來需要最佳化，可加一個 `POST /documents/thumb-urls` batch endpoint，目前不實作。

**[Trade-off] Grid 只做 grid，不支援 list view** → 接受。list view 未來可作為 view toggle 加回，不影響現有資料結構。

## Migration Plan

1. 部署後端：新 Alembic migration（`thumb_path` 欄位），舊資料 `thumb_path = NULL`
2. 舊書目縮圖不會自動補生成；若需要，可手動 `POST /documents/{id}/reprocess`
3. 前端直接覆蓋部署，舊書目顯示 fallback，新上傳書目自動有縮圖
4. Rollback：前端回滾即可，`thumb_path` 欄位 nullable 不影響既有功能

## Open Questions

- 縮圖是否需要在 `reprocess` 時重新生成？（目前：是，reprocess 會觸發完整 ingestion）
- TopicBar 標籤過多時（> 10 個）要橫向捲動還是折疊？（建議：橫向捲動 + `overflow-x: auto`，隱藏 scrollbar）
