import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDocumentTag,
  deleteDocument,
  getDocumentThumbUrl,
  listDocuments,
  removeDocumentTag,
  uploadDocument,
} from "../api/documents";
import { getDocumentTagTree } from "../api/documentTags";
import type { Document, DocumentTag, DocumentTagTree } from "../types";
import HeroShelf from "../components/HeroShelf";
import LibraryCard from "../components/LibraryCard";
import TopicBar from "../components/TopicBar";
import FolderUploadProgress, { type UploadItem } from "../components/FolderUploadProgress";
import { withConcurrency } from "../lib/concurrency";
import { isReaderMode } from "../lib/mode";
import * as localDocs from "../lib/localDocs";
import type { LocalDoc } from "../lib/localDocs";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function flattenTags(tree: unknown): DocumentTag[] {
  return asArray<DocumentTagTree>(tree).flatMap((tag) => [tag, ...flattenTags(tag.children)]);
}

function isPdf(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

function titleFromFile(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

function httpStatus(e: unknown): number | undefined {
  if (e && typeof e === "object") {
    const r = (e as { response?: { status?: number } }).response;
    if (r?.status) return r.status;
    return (e as { status?: number }).status;
  }
}

function shortError(e: unknown): string {
  const s = httpStatus(e);
  if (s === 413) return "超過 100MB";
  if (s === 403) return "已達上限";
  if (e instanceof Error) return e.message.slice(0, 40);
  return "上傳失敗";
}

export default function DocumentListPage() {
  // ── Full mode state ────────────────────────────────────────────────────────
  const [docs, setDocs] = useState<Document[]>([]);
  const [tagTree, setTagTree] = useState<DocumentTagTree[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyDocs, setBusyDocs] = useState<Record<string, boolean>>({});
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Map<string, string>>(new Map());
  const [uploadItems, setUploadItems] = useState<UploadItem[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);

  // ── Reader mode state ──────────────────────────────────────────────────────
  const [localDocsList, setLocalDocsList] = useState<LocalDoc[]>(
    () => (isReaderMode ? localDocs.listDocs() : [])
  );
  const [reloadTargetId, setReloadTargetId] = useState<string | null>(null);
  // Track which docs have a live blob URL (re-check after add/restore)
  const [blobVersion, setBlobVersion] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const readerReloadRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const refreshLocalDocs = () => {
    setLocalDocsList(localDocs.listDocs());
    setBlobVersion((v) => v + 1);
  };

  const isUploading = uploadItems !== null &&
    uploadItems.some((i) => i.status === "pending" || i.status === "uploading");

  useEffect(() => {
    if (!isUploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isUploading]);

  // ── Full mode data loading ─────────────────────────────────────────────────
  const load = async () => {
    if (isReaderMode) { refreshLocalDocs(); return; }
    const [documents, tree] = await Promise.all([listDocuments(), getDocumentTagTree()]);
    const docList = asArray<Document>(documents);
    setDocs(docList);
    setTagTree(asArray<DocumentTagTree>(tree));

    const entries = await Promise.allSettled(
      docList
        .filter((d) => d.thumb_path)
        .map((d) => getDocumentThumbUrl(d.id).then((url) => [d.id, url] as [string, string]))
    );
    const map = new Map<string, string>();
    for (const result of entries) {
      if (result.status === "fulfilled") map.set(result.value[0], result.value[1]);
    }
    setThumbUrls(map);
  };

  useEffect(() => { load(); }, []);

  // ── Full mode computed ─────────────────────────────────────────────────────
  const allTags = useMemo(() => flattenTags(tagTree), [tagTree]);
  const recentDocs = useMemo(
    () => [...docs].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 5),
    [docs],
  );
  const countByTagId = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of docs)
      for (const tag of doc.document_tags)
        map.set(tag.id, (map.get(tag.id) ?? 0) + 1);
    return map;
  }, [docs]);
  const untaggedDocs = useMemo(() => docs.filter((d) => d.document_tags.length === 0), [docs]);
  const filteredDocs = useMemo(() => {
    if (selectedTagId === null) return docs;
    if (selectedTagId === "untagged") return untaggedDocs;
    return docs.filter((doc) => doc.document_tags.some((t) => t.id === selectedTagId));
  }, [docs, selectedTagId, untaggedDocs]);

  // ── Upload handlers ────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";

    if (isReaderMode) {
      localDocs.addDoc(file);
      refreshLocalDocs();
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(file);
      await load();
    } finally {
      setUploading(false);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (folderRef.current) folderRef.current.value = "";

    const pdfs = files.filter(isPdf);
    const skipped = files.length - pdfs.length;
    setSkippedCount(skipped);

    if (pdfs.length === 0) {
      alert("資料夾中沒有 PDF 檔案");
      return;
    }

    const existingTitles = new Set(docs.map((d) => d.title));
    const initial: UploadItem[] = pdfs.map((f) => ({
      name: f.name,
      status: existingTitles.has(titleFromFile(f)) ? "skipped" : "pending",
    }));
    setUploadItems(initial);

    const tasks = pdfs.map((file, i) => async () => {
      if (initial[i].status === "skipped") return;
      setUploadItems((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[i] = { ...next[i], status: "uploading" };
        return next;
      });
      await uploadDocument(file);
      setUploadItems((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[i] = { ...next[i], status: "done" };
        return next;
      });
    });

    await withConcurrency(tasks, 3).then((results) => {
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const isDuplicate = httpStatus(r.reason) === 409;
          setUploadItems((prev) => {
            if (!prev) return prev;
            const next = [...prev];
            next[i] = isDuplicate
              ? { ...next[i], status: "skipped" }
              : { ...next[i], status: "error", error: shortError(r.reason) };
            return next;
          });
        }
      });
    });

    await load();
  };

  // ── Full mode tag handlers ─────────────────────────────────────────────────
  const mutateDocTags = async (docId: string, mutate: () => Promise<unknown>) => {
    if (busyDocs[docId]) return;
    setBusyDocs((prev) => ({ ...prev, [docId]: true }));
    try {
      await mutate();
      await load();
    } finally {
      setBusyDocs((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleToggleTag = (doc: Document, tag: DocumentTag) => {
    const isAssigned = doc.document_tags.some((t) => t.id === tag.id);
    void mutateDocTags(doc.id, () =>
      isAssigned ? removeDocumentTag(doc.id, tag.id) : addDocumentTag(doc.id, tag.id),
    );
  };

  const handleDelete = (doc: Document) => {
    if (confirm(`刪除「${doc.title}」？`)) {
      void deleteDocument(doc.id).then(load);
    }
  };

  // ── Reader mode delete ─────────────────────────────────────────────────────
  const handleReaderDelete = (id: string) => {
    const doc = localDocsList.find((d) => d.id === id);
    if (!doc) return;
    if (confirm(`刪除「${doc.title}」？`)) {
      localDocs.deleteDoc(id);
      refreshLocalDocs();
    }
  };

  // ── Reader mode reload ─────────────────────────────────────────────────────
  const handleReaderCardClick = (localDoc: LocalDoc) => {
    if (localDocs.getBlobUrl(localDoc.id)) {
      nav(`/reader/${localDoc.id}`);
    } else {
      setReloadTargetId(localDoc.id);
      readerReloadRef.current?.click();
    }
  };

  const handleReaderReload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reloadTargetId) return;
    localDocs.restoreBlob(reloadTargetId, file);
    setReloadTargetId(null);
    refreshLocalDocs();
    if (readerReloadRef.current) readerReloadRef.current.value = "";
    nav(`/reader/${reloadTargetId}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      <div className="doc-list__header">
        <h1>文件庫</h1>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {!isReaderMode && (
            <button
              className="btn btn--ghost"
              onClick={() => folderRef.current?.click()}
              disabled={uploadItems !== null && uploadItems.some((i) => i.status === "uploading" || i.status === "pending")}
            >
              上傳資料夾
            </button>
          )}
          <button
            className="btn btn--primary"
            onClick={() => fileRef.current?.click()}
            disabled={!isReaderMode && uploading}
          >
            {!isReaderMode && uploading ? "上傳中..." : "+ 上傳 PDF"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleUpload} />
        {!isReaderMode && (
          <input ref={folderRef} type="file" hidden onChange={handleFolderUpload}
            // @ts-expect-error webkitdirectory is not in React's type definitions
            webkitdirectory=""
          />
        )}
        {/* Hidden input for reloading an invalidated blob URL in reader mode */}
        <input ref={readerReloadRef} type="file" accept=".pdf" hidden onChange={handleReaderReload} />
      </div>

      {!isReaderMode && uploadItems !== null && (
        <FolderUploadProgress
          items={uploadItems}
          skippedCount={skippedCount}
          onDismiss={() => setUploadItems(null)}
        />
      )}

      {/* ── Reader mode ─────────────────────────────────────────────── */}
      {isReaderMode && (
        <>
          {localDocsList.length === 0 && (
            <p className="empty-state">尚無文件，請上傳 PDF。</p>
          )}
          {localDocsList.length > 0 && (
            <div className="library-page">
              <section className="library-section">
                <h2 className="library-section__heading">
                  本機文件庫
                  <span className="library-section__count">{localDocsList.length}</span>
                </h2>
                <div className="library-grid">
                  {localDocsList.map((localDoc) => {
                    const hasBlob = localDocs.getBlobUrl(localDoc.id) !== null;
                    // blobVersion in dep array ensures re-check after restore
                    void blobVersion;
                    return (
                      <div key={localDoc.id} style={{ position: "relative" }}>
                        <LibraryCard
                          doc={localDocs.toDocument(localDoc)}
                          thumbUrl={null}
                          allTags={[]}
                          isBusy={false}
                          onToggleTag={() => {}}
                          onDelete={() => handleReaderDelete(localDoc.id)}
                          onClick={() => handleReaderCardClick(localDoc)}
                          showTagging={false}
                        />
                        {!hasBlob && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,0.55)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              borderRadius: "var(--radius-md)",
                              color: "#fff",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleReaderCardClick(localDoc)}
                          >
                            <span>需重新載入</span>
                            <span style={{ fontSize: "11px", opacity: 0.8 }}>點擊選取 PDF</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* ── Full mode ───────────────────────────────────────────────── */}
      {!isReaderMode && docs.length === 0 && (
        <p className="empty-state">尚無文件，請上傳 PDF。</p>
      )}

      {!isReaderMode && docs.length > 0 && (
        <div className="library-page">
          <section className="library-section">
            <h2 className="library-section__heading">最近閱讀</h2>
            <HeroShelf docs={recentDocs} thumbUrls={thumbUrls} onNavigate={(id) => nav(`/reader/${id}`)} />
          </section>

          <TopicBar
            tags={allTags}
            countByTagId={countByTagId}
            untaggedCount={untaggedDocs.length}
            selectedTagId={selectedTagId}
            onSelect={setSelectedTagId}
          />

          <section className="library-section">
            <h2 className="library-section__heading">
              {selectedTagId === null
                ? "全部書目"
                : selectedTagId === "untagged"
                ? "未歸類"
                : (allTags.find((t) => t.id === selectedTagId)?.name ?? "書目")}
              <span className="library-section__count">{filteredDocs.length}</span>
            </h2>
            {filteredDocs.length === 0 ? (
              <p className="empty-state">此主題目前沒有書。</p>
            ) : (
              <div className="library-grid">
                {filteredDocs.map((doc) => (
                  <LibraryCard
                    key={doc.id}
                    doc={doc}
                    thumbUrl={thumbUrls.get(doc.id) ?? null}
                    allTags={allTags}
                    isBusy={busyDocs[doc.id] ?? false}
                    onToggleTag={(tag) => handleToggleTag(doc, tag)}
                    onDelete={() => handleDelete(doc)}
                    onClick={() => nav(`/reader/${doc.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
