## Why

目前文件庫只提供平鋪列表，當文件數量接近 100 本時，使用者很難先用「主題」快速縮小範圍，再從中找到最近關注的書。現有標籤系統只服務 highlight 知識點，不適合直接承擔「找書」的文件分類需求，因此需要補上文件層級的組織能力。

## What Changes

- 為文件新增獨立於 highlight tags 的 `document tags`，支援一對多掛載與移除。
- 擴充文件列表與詳情 API，回傳文件標籤與可依文件標籤篩選。
- 重組文件列表頁，新增「最近活動」捷徑區與依文件標籤分組的可折疊主題區塊。
- 在文件卡片提供 inline 文件標籤顯示與快速掛載/移除互動。
- 保留既有 highlight tag 能力與資料，不與 document tag 共用語意或管理流程。

## Capabilities

### New Capabilities
- `document-tagging`: 提供文件層級標籤模型、API 與 UI，讓使用者可用主題標記與整理文件。
- `document-library-organization`: 提供最近活動捷徑、依文件標籤分組的文件瀏覽方式，以及文件列表 API 所需的組織資訊。

### Modified Capabilities
- None.

## Impact

- Affected code: `backend/app/models/document.py`, `backend/app/models/tag.py`, `backend/app/schemas/document.py`, `backend/app/services/document_service.py`, `backend/app/routers/documents.py`, `backend/tests/test_documents.py`, `frontend/src/pages/DocumentListPage.tsx`, `frontend/src/api/documents.ts`, `frontend/src/types/index.ts`
- New code likely needed: document-tag junction model/migration, document tag API helpers, document list grouping UI state
- APIs: `GET /documents` response shape changes; new document tag attach/remove endpoints will be added
- Data model: new document-tag relation stored separately from existing highlight-tag relation
