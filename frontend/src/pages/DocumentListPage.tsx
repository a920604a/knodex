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
    // axios: e.response.status
    const r = (e as { response?: { status?: number } }).response;
    if (r?.status) return r.status;
    // direct status property
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
  const [docs, setDocs] = useState<Document[]>([]);
  const [tagTree, setTagTree] = useState<DocumentTagTree[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyDocs, setBusyDocs] = useState<Record<string, boolean>>({});
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Map<string, string>>(new Map());
  const [uploadItems, setUploadItems] = useState<UploadItem[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

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

  const load = async () => {
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file);
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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

  return (
    <div className="page-content">
      <div className="doc-list__header">
        <h1>文件庫</h1>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button
            className="btn btn--ghost"
            onClick={() => folderRef.current?.click()}
            disabled={uploadItems !== null && uploadItems.some((i) => i.status === "uploading" || i.status === "pending")}
          >
            上傳資料夾
          </button>
          <button
            className="btn btn--primary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "上傳中..." : "+ 上傳 PDF"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleUpload} />
        {/* webkitdirectory ignores accept; PDF filtering is done in handleFolderUpload */}
        <input ref={folderRef} type="file" hidden onChange={handleFolderUpload}
          // @ts-expect-error webkitdirectory is not in React's type definitions
          webkitdirectory=""
        />
      </div>

      {uploadItems !== null && (
        <FolderUploadProgress
          items={uploadItems}
          skippedCount={skippedCount}
          onDismiss={() => setUploadItems(null)}
        />
      )}

      {docs.length === 0 && <p className="empty-state">尚無文件，請上傳 PDF。</p>}

      {docs.length > 0 && (
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
