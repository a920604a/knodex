## Context

目前系統已具備 PDF 上傳、文件列表、閱讀器、highlight 與 highlight tag。文件列表頁仍是單層平鋪卡片，對於約 100 本文件的使用情境，缺少主題導向的入口，也沒有把最近更新的文件前置成捷徑。

這次變更同時跨到資料模型、後端 API、前端文件列表與標籤互動，且使用者已明確區分兩種語意：
- `document tag`: 幫助找到想讀的書
- `highlight tag`: 幫助找到知識點

因此這不是單純 UI 重排，而是一次新的文件組織能力。

## Goals / Non-Goals

**Goals:**
- 讓文件可以被獨立於 highlight 的主題標籤分類
- 讓文件列表頁提供「最近活動」捷徑與依主題樹分組的主要入口
- 支援在文件卡片上快速掛載與移除文件標籤
- 保持現有 highlight tag 行為與資料完全可用

**Non-Goals:**
- 不合併 document tag 與 highlight tag 的資料池
- 不實作自動標籤、推薦分類或 AI 整理
- 不在本次加入拖拉式資料夾互動
- 不修改 PDF reader 與 highlight 建立流程

## Decisions

### Decision 1: 文件標籤使用獨立資料表，而非共用現有 `tags`

**Choice:** 新增 `document_tags` 與 `document_tag_links`（或等價命名）兩張表，獨立於 `tags` / `highlight_tags`。

**Why:**
- 使用者已明確要求 document tag 與 highlight tag 語意分離
- 文件主題通常是高層分類，highlight tag 往往更細碎，混用同一池會讓管理畫面與搜尋語意混亂
- 未來若文件標籤需要額外欄位（顏色、排序、封存狀態），可獨立擴充

**Alternatives considered:**
- 共用現有 `tags` 表：資料庫較省，但會讓「書本分類」與「知識點分類」互相污染
- 只新增 `document_tags` junction、沿用 `tags` 當主表：仍無法解決語意混淆

### Decision 2: 文件列表 API 直接回傳文件標籤，前端自行計算最近活動與分組

**Choice:** `GET /documents` 與 `GET /documents/{id}` 直接包含 `document_tags[]`；前端依 `updated_at` 算出最近活動，依 tag tree 組裝顯示結構。

**Why:**
- 最近活動是純展示邏輯，不必新增專用 API
- 文件列表量級約 100 筆，前端做排序與分組成本低且互動較靈活
- 單一列表 payload 可同時支援平面搜尋、最近活動與主題樹瀏覽

**Alternatives considered:**
- 後端提供 `GET /documents/organized`：回傳結構化資料較直接，但會把展示決策鎖死在 API
- 後端提供 `GET /documents/recent`：可行，但與完整列表資訊重疊高

### Decision 3: 主題樹使用獨立 `document-tags` API，保留現有 `tags` API 給 highlight

**Choice:** 新增 `/document-tags` 與 `/document-tags/tree`，文件掛載端點為 `/documents/{id}/tags`。

**Why:**
- 保持 API 資源語意清楚，前端不需要在同一 endpoint 判斷 tag 類型
- 可沿用現有 tag tree 心智模型，但不影響 highlight 功能
- 文件掛載行為仍掛在 `/documents/{id}` 之下，符合資源歸屬

**Alternatives considered:**
- 在 `/tags` 加 `scope=document|highlight`：單一路徑較少，但會讓驗證與刪除規則更複雜

### Decision 4: 最近活動是 pinned shortcut，文件仍保留在主題分組內

**Choice:** 文件可同時出現在「最近活動」與其所屬主題區塊；最近活動只是一個捷徑區。

**Why:**
- 這符合使用者已確認的操作預期
- 避免將最近活動與主分組切成兩套互斥資料來源

**Alternatives considered:**
- 最近活動只顯示連結、不顯示卡片：較省空間，但捷徑價值較低
- 最近活動中的文件從主題區塊隱藏：會破壞按主題瀏覽的一致性

### Decision 5: 未分類文件保留獨立區塊

**Choice:** 沒有任何 document tag 的文件顯示在 `未分類` 區塊。

**Why:**
- 上傳後可立即出現在列表中，不必先補 tag 才看得到
- 可作為後續整理入口

## Risks / Trade-offs

- [文件可掛多個 document tag，可能在多個分組重複出現] → 以「直接掛載在哪個標籤，就出現在哪個標籤節點」的規則保持可預期，並在 UI 上接受重複顯示
- [新增第二套標籤系統會增加維護成本] → 保持 API 與 schema 命名清楚，並共用部分服務層實作模式與測試結構
- [文件列表 payload 變大] → 文件量目前約 100 筆且 tag 數有限，可接受；若未來成長再補分頁或 lazy loading
- [前端樹狀組裝邏輯較複雜] → 將分組邏輯封裝成純函式並補 UI/單元測試

## Migration Plan

1. 新增 `document_tags` 與 `document_tag_links` migration，佈署後不影響既有資料
2. 擴充後端 schema 與文件 API，先讓新欄位可讀寫
3. 新增文件標籤管理 API 與測試
4. 更新前端 types/API，最後切換 `DocumentListPage` 為新組織模式
5. 若需回滾，可移除前端新 UI 並停用新 API；舊文件列表仍可依現有 `GET /documents` 基礎欄位運作

## Open Questions

- 文件標籤建立入口是否只放在文件列表頁，或也要在閱讀器頁補同樣操作
- 同一文件掛在父標籤與子標籤時，UI 是否要去重或明確保留雙重顯示
