## 1. tokens.css — 元件樣式重定義

- [x] 1.1 `.btn`：min-height 36px、padding 0 16px、border rgba(0,0,0,0.2)、display inline-flex align-items center
- [x] 1.2 `.btn` hover：改用 `filter: brightness(0.92)` 取代 `opacity: 0.75`
- [x] 1.3 `.btn` focus-visible：`outline: 2px solid var(--color-accent); outline-offset: 2px`
- [x] 1.4 `.btn--sm`：新增小尺寸 variant，min-height 28px、padding 0 10px、font-size callout
- [x] 1.5 `.input`：min-height 36px、padding 0 12px、border rgba(0,0,0,0.2)
- [x] 1.6 `.input` focus-visible：`outline: 2px solid var(--color-accent); outline-offset: 0`
- [x] 1.7 `.tag-chip`：border-radius 999px、background `color-mix(in srgb, var(--color-accent) 12%, transparent)`
- [x] 1.8 `.sidebar__item` active：background `color-mix(in srgb, var(--color-accent) 12%, transparent)`、color accent
- [x] 1.9 `.sidebar__item` hover：background var(--color-fill)
- [x] 1.10 新增 `.sidebar__icon`：width/height 16px、flex-shrink 0、opacity 0.7（active 時 1.0）

## 2. Sidebar.tsx — 加入 icon

- [x] 2.1 為「書庫」加入書架 SVG icon（inline）
- [x] 2.2 為「AI 問答」加入對話泡泡 SVG icon
- [x] 2.3 為「搜尋」加入放大鏡 SVG icon
- [x] 2.4 為「知識標籤」加入標籤 SVG icon
- [x] 2.5 為「管理後台」加入齒輪 SVG icon
- [x] 2.6 nav item 結構改為 `<span class="sidebar__icon">…svg…</span> <span>{label}</span>`

## 3. QueryPage.tsx — 消除 inline style

- [x] 3.1 頁面容器改用 `.page-content`
- [x] 3.2 form 改用 `.search-bar` class
- [x] 3.3 `<input>` 加上 `className="input"`
- [x] 3.4 `<button type="submit">` 加上 `className="btn btn--primary"`
- [x] 3.5 error `<p>` 改用 `.error-text` class
- [x] 3.6 answer 區塊改用 `.card`
- [x] 3.7 source chunk inline style 改用 `.card card--sm`

## 4. AuthPage.tsx — 消除 inline style

- [x] 4.1 外層容器改用 `.auth-page`
- [x] 4.2 Google 登入按鈕改用 `.btn .btn--google`
- [x] 4.3 error `<p>` 改用 `.error-text`

## 5. BookCard.tsx — 消除 inline style

- [x] 5.1 ingestion status badge inline style 改用 `.badge--warning` / `.badge--error`
- [x] 5.2 確認其他 inline style 已移除或改用 class

## 6. 視覺驗收

- [ ] 6.1 書庫頁：button / input 高度一致，tag chip 為 pill 形狀
- [ ] 6.2 QueryPage：input 和 button 對齊，card 樣式一致
- [ ] 6.3 Sidebar：所有 nav item 有 icon，active 項目顯示 accent 色
- [ ] 6.4 AuthPage：Google 登入按鈕樣式整齊
- [ ] 6.5 Dark mode：所有修改的元件在深色模式下顯示正確
