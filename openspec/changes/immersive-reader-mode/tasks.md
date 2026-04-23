## 1. 連續頁模式（Continuous Page Scroll）

- [x] 1.1 在 `ReaderPage` 新增 `isContinuous` boolean state，預設 `false`
- [x] 1.2 實作連續頁渲染：`Array.from({ length: numPages })` 依序渲染 `<Page>`，每頁包裝在 `<div data-page={i}>` 內
- [x] 1.3 以 `IntersectionObserver`（threshold 0.5）觀察所有 `[data-page]` div，可見頁超過 50% 時更新 `currentPage`
- [x] 1.4 `isContinuous` 切換時，scroll container 以 `scrollIntoView({ behavior: 'instant' })` 跳到 `currentPage` 對應 div
- [x] 1.5 新增頁面模式切換按鈕至 Toolbar（圖示或文字「單頁 / 連續」）
- [x] 1.6 鍵盤快捷鍵 `C`：在 `useEffect` 監聽 `keydown`，切換 `isContinuous`
- [x] 1.7 CSS：`.reader-continuous` class，讓 scroll container 顯示所有頁面且有頁間距

## 2. 沉浸式閱讀模式（Immersive Reading Mode）

- [x] 2.1 新增 `isImmersive` boolean state，預設 `false`
- [x] 2.2 `isImmersive` 為 true 時，對 `.reader-layout` 加上 `.reader--immersive` class，CSS 隱藏 `.toolbar` 與 `.reader-inspector`
- [x] 2.3 實作浮動控制列元件（`FloatingControls`）：含退出沉浸按鈕、當前頁碼、頁面模式切換
- [x] 2.4 Pointer idle 計時器：`useRef` 存 timeout handle，`pointermove` 時重置；3 秒無操作後隱藏浮動列（CSS opacity + pointer-events）
- [x] 2.5 新增「沉浸」按鈕至 Toolbar
- [x] 2.6 鍵盤快捷鍵 `F`：監聽 `keydown`，切換 `isImmersive`
- [x] 2.7 CSS：`.reader--immersive` 讓 PDF 區域填滿 100dvh；`.floating-controls` 定位於底部中央，有 backdrop-blur 效果

## 3. CSS Tokens

- [x] 3.1 在 `tokens.css` 新增 `.reader--immersive` 與 `.reader--continuous` 相關 rules
- [x] 3.2 新增 `.floating-controls` 定位與過渡動畫 CSS
- [x] 3.3 驗證沉浸模式下無殘留 layout gap（toolbar height 歸零）

## 4. 驗證

- [ ] 4.1 單頁模式：翻頁、進度同步正常
- [ ] 4.2 連續頁模式：捲動更新頁碼、進度 debounce 正常
- [ ] 4.3 切換模式時頁面位置保留
- [ ] 4.4 沉浸模式：Toolbar 與 Sidebar 完全消失、浮動列 idle 淡出
- [ ] 4.5 快捷鍵 `F` / `C` 功能正常
