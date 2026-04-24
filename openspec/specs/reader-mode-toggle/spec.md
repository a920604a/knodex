## ADDED Requirements

### Requirement: Build-time mode constant
前端 SHALL 提供 `src/lib/mode.ts`，export `isReaderMode: boolean`，值為 `import.meta.env.VITE_APP_MODE === "reader"`。所有 reader mode 條件判斷 SHALL 統一引用此常數。

#### Scenario: Full mode build
- **WHEN** build 時未設定 `VITE_APP_MODE` 或其值不為 `"reader"`
- **THEN** `isReaderMode` 為 `false`，所有功能正常可用

#### Scenario: Reader mode build
- **WHEN** build 時設定 `VITE_APP_MODE=reader`
- **THEN** `isReaderMode` 為 `true`，後端依賴功能全部停用

### Requirement: Reader mode routing
Reader mode build 的 React Router SHALL 只包含 `/`（書庫）與 `/reader/:localId` 兩個路由。其餘路由（`/query`、`/search`、`/tags`、`/admin`）SHALL 不被 render，直接 redirect 至 `/`。

#### Scenario: Navigating to backend-only route in reader mode
- **WHEN** 使用者在 reader mode 導航至 `/query`、`/search`、`/tags` 或 `/admin`
- **THEN** 自動 redirect 至 `/`

### Requirement: Sidebar hides backend features in reader mode
Sidebar 元件 SHALL 在 `isReaderMode === true` 時隱藏以下 nav 項目：搜尋、RAG 問答、知識標籤、Admin。

#### Scenario: Sidebar in reader mode
- **WHEN** reader mode build 載入
- **THEN** Sidebar 只顯示「文件庫」連結，不顯示後端依賴功能

### Requirement: Base path support
前端 SHALL 從 `import.meta.env.VITE_BASE_PATH` 讀取 base path（預設 `/`）。React Router 的 `basename` 與 Vite 的 `base` 均 SHALL 使用此值，以支援 GitHub Pages 子路徑部署。

#### Scenario: GitHub Pages subpath
- **WHEN** build 時設定 `VITE_BASE_PATH=/Knodex/`
- **THEN** 所有前端路由與資源路徑均以 `/Knodex/` 為前綴，頁面正常載入
