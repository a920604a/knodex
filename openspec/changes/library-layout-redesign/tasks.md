## 1. 元件拆分準備

- [ ] 1.1 新增 `frontend/src/components/BookCard.tsx`：接受 `doc: Document`，含封面色塊、標題、進度條、主題 chip
- [ ] 1.2 新增 `frontend/src/components/HeroShelf.tsx`：接受 `docs: Document[]`，水平捲動書封列
- [ ] 1.3 新增 `frontend/src/components/TopicRail.tsx`：接受 `tags: DocumentTag[]`、`docsByTagId`、`selectedTagId`、`onSelect`

## 2. Hero Shelf 書封列

- [ ] 2.1 `HeroShelf` 取最近 5 本（依 `updated_at` 排序），水平排列、overflow-x scroll
- [ ] 2.2 每個書封卡含：title hash 色塊（`hsl(hash % 360, 60%, 70%)`）、標題截斷、進度條
- [ ] 2.3 CSS：`.hero-shelf`、`.hero-card`、`.hero-card__cover`、`.hero-card__progress-bar`

## 3. Topic Rail 主題側欄

- [ ] 3.1 `TopicRail` 渲染「全部」＋所有 tag，顯示各 tag 的書本數量
- [ ] 3.2 點選 tag 更新 `selectedTagId` state（`null` 代表全部）
- [ ] 3.3 選中項目套用 `.topic-rail__item--active` class
- [ ] 3.4 CSS：`.topic-rail`（固定寬 160px、垂直捲動）、`.topic-rail__item`、`.topic-rail__count`

## 4. DocumentListPage 版面重組

- [ ] 4.1 移除現有 `.library-layout` 兩欄結構，改為單欄垂直 `.library-page`
- [ ] 4.2 版面：`[TopicRail | 主內容區]` 左右並排，主內容區為 `[HeroShelf] + [書本列表]`
- [ ] 4.3 書本列表依 `selectedTagId` 篩選：`null` 顯示全部，否則只顯示有該 tag 的書
- [ ] 4.4 移除原有 `TagGroup` 樹狀分組，改由 `TopicRail` 篩選取代
- [ ] 4.5 保留「未歸類」邏輯：`selectedTagId === 'untagged'` 顯示 `document_tags.length === 0` 的書

## 5. BookCard 升級

- [ ] 5.1 `BookCard` 替換原 `renderDocCard`，加入 `.book-card__progress-bar` 進度視覺化
- [ ] 5.2 保留原有 `TopicDropdown`（設定主題）與刪除按鈕功能
- [ ] 5.3 CSS：`.book-card`、`.book-card__progress-bar`（height 3px，accent color）

## 6. CSS Tokens

- [ ] 6.1 在 `tokens.css` 新增 hero shelf、topic rail、book card progress bar 相關 rules
- [ ] 6.2 確認 `.library-page` 在現有 `.app-content` 的 overflow-y: auto 容器內正常捲動

## 7. 驗證

- [ ] 7.1 Hero shelf 顯示最近 5 本、色塊正確、點擊導航正常
- [ ] 7.2 Topic rail 顯示所有 tag 及書本數量、篩選功能正常
- [ ] 7.3 書本列表篩選與「全部」切換正常
- [ ] 7.4 書卡進度條與主題 chip 顯示正確
- [ ] 7.5 新增／刪除書卡後 rail 數量即時更新
