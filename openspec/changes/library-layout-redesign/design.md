## Context

目前 `DocumentListPage.tsx` 將「最近閱讀」（水平 5 本）與「主題書架」並排於 `.library-layout` 兩欄，書卡採用垂直堆疊的 list item，主題標籤透過書卡內 dropdown 操作。參考 [a920604a-labs ebook](https://github.com/a920604a/a920604a-labs) 的設計方向：清晰的書庫分類、封面視覺化、主題側邊瀏覽。

## Goals / Non-Goals

**Goals:**
- 頁面整體改為單欄垂直捲動，增加呼吸感
- 「最近閱讀」改為水平書封捲動列（hero shelf）
- 新增左側 topic rail 作為主題快速篩選入口
- 書卡加入進度條視覺化

**Non-Goals:**
- 書封縮圖（後端未支援封面擷取）
- RWD 行動版（目前以桌面優先）
- 改動後端 API

## Decisions

### D1：Topic Rail 位置 — 左側固定 vs 頂部 Tab

選擇：**左側固定 rail**，寬度 160px，與 app sidebar 共用左側空間（rail 置於 content 區域左側，非全域 sidebar）。  
理由：主題數量可能超過 10 個，頂部 Tab 超過一行會折行，左側 rail 可垂直捲動容納更多主題。  
替代方案：頂部水平 Tabs — 適合主題少（< 6）的情境，但 Knodex 預設 11 個主題，空間不足。

### D2：Hero Shelf 書封佔位 — 色塊 vs 空白

選擇：**帶書名首字的色塊**（依書名 hash 產生背景色），作為封面縮圖缺席時的視覺代替。  
理由：純白佔位框視覺單調，隨機色塊能快速辨識個別書目，且不需後端支援。

### D3：篩選狀態 — URL query vs React state

選擇：**React state**（`selectedTagId`），不寫入 URL。  
理由：書庫篩選是即時互動狀態，不需分享連結；URL 參數增加複雜度，收益低。

### D4：書卡進度條 — CSS width % vs SVG

選擇：**CSS `width: {progress}%`** 的簡單進度條 div。  
理由：實作成本最低，視覺效果足夠，未來可替換為 SVG 圓形進度而無需改動資料層。

## Risks / Trade-offs

- [Topic Rail 佔用水平空間] → Rail 可 collapse，收合時顯示 icon-only 模式（v2 feature）
- [Hero Shelf 書名 hash 色塊碰撞] → 僅視覺影響，可接受
- [DocumentListPage 改動範圍大] → 拆分為獨立元件（`BookCard`、`TopicRail`、`HeroShelf`）降低耦合
