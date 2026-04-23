## Why

目前文件庫頁面將「最近閱讀」與「主題書架」並排，書卡設計密度過高，視覺層次不清晰。參考 a920604a-labs 的電子書閱讀器設計（離線優先、清晰的書庫分類瀏覽），重新設計 Library 版面，提升視覺質感與瀏覽效率。

## What Changes

- **書庫首頁 layout 重構**：改為垂直捲動單欄主視圖，上方為「最近閱讀」水平捲動書封列，下方為主題書架樹狀瀏覽
- **書卡（BookCard）視覺升級**：加入封面縮圖佔位區、閱讀進度條視覺化、主題 chip 排列優化
- **主題側欄（Topic Rail）**：將主題標籤從下拉卡片移至左側固定 rail，點選快速篩選書目
- **空狀態設計**：未歸類區與空書庫提供引導性空狀態插圖與 CTA

## Capabilities

### New Capabilities

- `library-hero-shelf`: 最近閱讀水平書封捲動列，顯示封面佔位、標題、進度
- `topic-rail`: 左側固定主題 rail，點選即篩選對應書目，取代現有下拉選單式主題切換

### Modified Capabilities

（無現有 spec）

## Impact

- `frontend/src/pages/DocumentListPage.tsx`：版面結構重組
- `frontend/src/styles/tokens.css`：新增 library hero、topic rail、book card 相關 token 與 class
- `frontend/src/components/`：可能新增 `BookCard.tsx`、`TopicRail.tsx` 元件
- 不影響後端 API
