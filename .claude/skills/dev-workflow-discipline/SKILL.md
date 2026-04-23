---
name: dev-workflow-discipline
description: Use when about to commit code, push to git, or implement features after a user question or request — enforces explicit-only git operations and proper planning before implementation
---

# 開發工作流程紀律

## 核心原則

**使用者說什麼，才做什麼。不多做，不預判。**

兩條鐵律：
1. **沒有明確指令，不執行任何 git 操作**
2. **實作之前，必須走完規劃流程**

---

## 鐵律一：Git 操作只在明確指令下執行

### 規則

只有使用者明確說出以下詞語，才執行對應操作：

| 使用者說 | 才可以執行 |
|---------|-----------|
| 「commit」、「提交」 | `git commit` |
| 「push」、「推上去」 | `git push` |
| 「commit 並 push」 | 兩者都執行 |

**使用者說「實作」、「更新」、「修改」、「修 bug」→ 只改程式碼，不 commit。**

### 紅旗：停下來，不要 commit

出現這些想法時，立刻停止：

| 想法 | 現實 |
|-----|------|
| 「順手 commit 比較整齊」 | 這是使用者的倉庫，整不整齊由使用者決定 |
| 「反正等一下也要 commit」 | 等使用者說了再做 |
| 「這樣使用者比較方便」 | 使用者沒要求 = 不需要 |
| 「我已經改完了，commit 是自然下一步」 | 不是。停在改完，等指令 |

---

## 鐵律二：實作之前必須走完規劃流程

### 規則

使用者說「做 X」、「實作 X」、「加 X 功能」→ **不是直接寫程式碼**。

正確流程：
```
使用者提出需求
    → 使用 superpowers:brainstorming skill
    → 確認設計
    → 使用 superpowers:writing-plans skill
    → 使用者確認計畫
    → 才開始實作
```

### 例外：使用者明確跳過規劃

使用者說「直接做」、「不用規劃」、「就這樣做」→ 可以跳過規劃，直接實作。
但仍然**不自動 commit**。

### 回答問題 ≠ 實作

使用者問「這樣有沒有邏輯問題？」、「X 是什麼？」→ **只回答，不修程式碼**。

---

## 正確行為範例

```
使用者：「這樣有邏輯問題嗎？」
✅ 正確：解釋問題所在，提出可能的解法，等使用者決定
❌ 錯誤：解釋完後直接說「好，我來修」然後改程式碼

使用者：「update document」
✅ 正確：更新文件，停在更新完，等使用者說是否 commit
❌ 錯誤：更新完自動 commit

使用者：「實作」
✅ 正確：實作完成，列出變更內容，等待下一個指令
❌ 錯誤：實作完自動 commit
```

---

## 快速檢查表

每次要執行操作前，問自己：

- [ ] 使用者有明確說 commit / push 嗎？→ 沒有就不做
- [ ] 使用者是在問問題，還是要求實作？→ 問題只回答
- [ ] 這個實作有走過 brainstorming + writing-plans 嗎？→ 沒有就先規劃
