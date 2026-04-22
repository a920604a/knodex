## ADDED Requirements

### Requirement: 自動跟隨系統 Dark Mode
系統 SHALL 透過 `@media (prefers-color-scheme: dark)` 覆蓋所有 color token，無需使用者手動切換。

#### Scenario: 系統切換至 Dark Mode
- **WHEN** 作業系統切換至深色模式
- **THEN** 所有色彩 token 自動切換為 dark variant，頁面無需重新整理

#### Scenario: 系統維持 Light Mode
- **WHEN** 作業系統使用淺色模式
- **THEN** 所有色彩 token 使用 light variant

---

### Requirement: Dark Mode 下毛玻璃 Sidebar 材質調整
系統 SHALL 在 Dark Mode 下將 sidebar 背景改為深色半透明。

#### Scenario: Dark Mode sidebar 材質
- **WHEN** 系統為深色模式
- **THEN** sidebar 背景為 `rgba(30,30,30,0.72)`，blur 效果維持不變

---

### Requirement: 所有元件色彩均透過 Token 切換，無 hardcode
系統 SHALL 確保任何元件不使用 hardcode 色彩值，使 Dark Mode 切換完整。

#### Scenario: 元件色彩在 Dark Mode 正確顯示
- **WHEN** 系統為深色模式
- **THEN** 文字、背景、邊框、按鈕、Card 所有元件均顯示對應 dark 色彩，無元件出現淺色背景 + 淺色文字的對比問題
