---
name: lessons-wiki
description: Use when a bug is fixed, a mistake is made, or an unexpected behavior is discovered — extracts the lesson and appends it to the project wiki at .claude/wiki/lessons.md
---

# 經驗 Wiki

## 核心原則

**每一個錯誤都是知識。不記錄就白費。**

當發現錯誤、修完 bug、或犯了行為上的失誤，立刻：
1. 分析根本原因
2. 提取可重用的教訓
3. 寫進 `.claude/wiki/lessons.md`

---

## 觸發時機

以下情況必須執行：

- Bug 被找到並修復
- Claude 的行為被使用者糾正（「不是這樣」、「你不應該...」）
- 出現 RuntimeWarning / Error 並找到原因
- 設計決策被推翻
- 安全問題被發現（hardcoded secrets 等）

---

## 寫入格式

在 `.claude/wiki/lessons.md` 新增一個條目：

```markdown
## [YYYY-MM-DD] 標題（一句話說明發生了什麼）

**症狀：** 看到的錯誤訊息或行為描述

**根本原因：** 真正的問題在哪裡，為什麼會發生

**教訓：** 下次怎麼做才對（具體、可執行）

**關鍵字：** tag1, tag2, tag3（方便之後搜尋）
```

---

## 寫作原則

- **症狀** 要夠具體，讓未來能認出同樣的問題
- **根本原因** 要解釋「為什麼」，不只說「是什麼」
- **教訓** 要是行動指南，不是感想
- **關鍵字** 用技術名詞 + 情境描述

---

## 快速檢查

寫完後確認：

- [ ] 未來看到同樣症狀，能找到這個條目嗎？
- [ ] 教訓是具體的行動，不是模糊的原則？
- [ ] 根本原因解釋了「為什麼」？
