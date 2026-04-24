## Context

現有上傳：單個 `<input type="file" accept=".pdf">`，`handleUpload` 只取 `files?.[0]`，呼叫一次 `uploadDocument()`。後端 `POST /documents` 每次處理單一檔案。

選定方案：**Strategy B（並行 concurrency=3，純前端）**，不修改後端。

## Goals / Non-Goals

**Goals:**
- 遞迴掃描資料夾內所有 PDF（`webkitdirectory` 原生支援）
- 客戶端過濾非 PDF（`.pdf` 副檔名 + `application/pdf` MIME）
- Concurrency=3 並行上傳，複用 `POST /documents`
- 即時每檔狀態顯示 + 完成摘要

**Non-Goals:**
- 不實作 drag-and-drop（可未來加）
- 不實作斷點續傳
- 不新增 `POST /documents/batch` 後端 endpoint
- 不對 quota 做批次預檢（讓後端 per-request 403 處理）

## Decisions

### D1：concurrency 控制 — 手寫，不引入 p-limit

```typescript
// src/lib/concurrency.ts
export async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (e) {
        results[i] = { status: "rejected", reason: e };
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}
```

不引入外部套件，邏輯透明，主任工程師可直接審查。

---

### D2：即時狀態更新 — React state array

```typescript
type FileStatus = "pending" | "uploading" | "done" | "error";

interface UploadItem {
  name: string;
  status: FileStatus;
  error?: string;
}
```

每個檔案在開始前設 `uploading`，完成後設 `done`/`error`，觸發 re-render 更新列表。

---

### D3：進度條 — 計算 done+error 比例，不用 XHR progress event

```
progress = (doneCount + errorCount) / total
```

XHR upload progress 需要 axios onUploadProgress，增加複雜度。對多檔上傳，「幾個完成」比「當前檔案傳了幾 %」更有意義。

---

### D4：完成摘要 overlay vs inline

**選擇 inline**：上傳完成後，進度區域原地轉為摘要（不彈 modal），摘要顯示 3 秒後自動收起，或用戶手動關閉。

---

### D5：非 PDF 過濾位置 — 客戶端，上傳前

```typescript
const pdfs = Array.from(files).filter(f =>
  f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf"
);
const skipped = files.length - pdfs.length;
```

後端仍有 `content_type != "application/pdf"` 檢查作為第二道防線。

## Risks / Trade-offs

**[Risk] `webkitdirectory` 在某些瀏覽器的行為** → Chrome/Safari/Firefox 現代版本全支援；IE/舊 Edge 已淘汰，不需考慮。

**[Risk] 資料夾有幾百個 PDF** → concurrency=3 會排隊，不會 overwhelm 後端；但 UI 列表可能很長。若超過 50 個，考慮只顯示前 20 個 + 「還有 N 個」。

**[Trade-off] concurrency=3 vs 後端 batch** → 犧牲一點網路效率（N 次 round trip），換來零後端改動和現有 quota/validation 不變。對 20 個 PDF 以內的實際使用，差異微不足道。

## Open Questions

- 資料夾上傳時是否要顯示子資料夾路徑（`file.webkitRelativePath`），還是只顯示檔名？
