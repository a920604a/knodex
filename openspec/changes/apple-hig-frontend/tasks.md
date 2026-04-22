## 1. Design Tokens

- [x] 1.1 建立 `src/styles/tokens.css`，定義所有 `--color-*` token（label、bg、surface、separator、fill、accent）
- [x] 1.2 加入 `@media (prefers-color-scheme: dark)` 覆蓋所有 color token 為 dark variant
- [x] 1.3 加入 `--font-sans` stack（`-apple-system, BlinkMacSystemFont, ...`）及五個字體大小 token
- [x] 1.4 加入 `--space-*`（xs/sm/md/lg/xl）、`--radius-*`（sm/md/lg）、`--shadow-*`（sm/md）token
- [x] 1.5 清除 `index.css` 與 `App.css` 中所有 Vite scaffold 樣式，替換為 HIG-based reset（margin 0、box-sizing border-box、font-family var(--font-sans)）
- [x] 1.6 在 `main.tsx` global import `tokens.css`

## 2. App Shell（三欄 Layout + Sidebar）

- [x] 2.1 在 `App.tsx` 以 CSS Grid 實作三欄 shell：`220px 1fr 0px`，全頁高度 `100dvh`
- [x] 2.2 建立 `src/components/Sidebar.tsx`：固定 220px，毛玻璃背景，含 app 標題與三個導覽項目
- [x] 2.3 加入 `@supports (backdrop-filter: blur())` fallback，不支援時降級為純色
- [x] 2.4 Sidebar 導覽項目 active 狀態（accent 色 pill），hover 狀態（fill 背景）
- [x] 2.5 移除舊版頂部 `<Nav>` 元件，改由 Sidebar 承擔導覽職責
- [x] 2.6 Reader 頁面進入時，grid 右欄展開為 300px（加上 `.inspector-open` class 切換）

## 3. 元件樣式重構

- [x] 3.1 在 `tokens.css`（或獨立 `components.css`）定義 `.btn`、`.btn--primary`、`.btn--danger` class
- [x] 3.2 定義 `.input`、`.input:focus` class
- [x] 3.3 定義 `.card`、`.card--clickable` class
- [x] 3.4 定義 `.modal-overlay`、`.modal` class
- [x] 3.5 定義 `.tag-chip` class
- [x] 3.6 定義 `.highlight-card` class（左側 accent border）
- [x] 3.7 定義 `.separator` class

## 4. 頁面 inline style 移除

- [x] 4.1 `DocumentListPage.tsx`：移除所有 inline style，改用 `.card.card--clickable`、`.btn.btn--primary`、`.input`
- [x] 4.2 `SearchPage.tsx`：移除 inline style，改用 `.card.card--clickable`、`.input`、`.tag-chip`
- [x] 4.3 `ReaderPage.tsx`：移除 inline style，Header 用 `.toolbar`，翻頁控制用 `.btn`
- [x] 4.4 `HighlightSidebar.tsx`：移除 inline style，改用 `.highlight-card`、`.tag-chip`、`.btn`
- [x] 4.5 `HighlightModal.tsx`：移除 inline style，改用 `.modal-overlay`、`.modal`、`.btn.btn--primary`、`.tag-chip`
- [x] 4.6 `TagManager.tsx`：移除 inline style，改用 `.card`、`.input`、`.btn`

## 5. 驗收

- [ ] 5.1 Light Mode：所有頁面視覺正確，無 hardcode 色彩殘留
- [ ] 5.2 Dark Mode：切換系統深色模式，所有元件正確顯示，無對比異常
- [ ] 5.3 毛玻璃 Sidebar：在有背景內容時可見 blur 效果
- [ ] 5.4 三欄 Layout：非 Reader 頁右欄隱藏；Reader 頁右欄展開 300px
- [x] 5.5 TypeScript 型別檢查通過（`npx tsc --noEmit`）
