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

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function flattenTags(tree: unknown): DocumentTag[] {
  return asArray<DocumentTagTree>(tree).flatMap((tag) => [tag, ...flattenTags(tag.children)]);
}

export default function DocumentListPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [tagTree, setTagTree] = useState<DocumentTagTree[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyDocs, setBusyDocs] = useState<Record<string, boolean>>({});
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Map<string, string>>(new Map());
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const load = async () => {
    const [documents, tree] = await Promise.all([listDocuments(), getDocumentTagTree()]);
    const docList = asArray<Document>(documents);
    setDocs(docList);
    setTagTree(asArray<DocumentTagTree>(tree));

    // Batch fetch thumb URLs
    const entries = await Promise.allSettled(
      docList
        .filter((d) => d.thumb_path)
        .map((d) => getDocumentThumbUrl(d.id).then((url) => [d.id, url] as [string, string]))
    );
    const map = new Map<string, string>();
    for (const result of entries) {
      if (result.status === "fulfilled") {
        map.set(result.value[0], result.value[1]);
      }
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
    for (const doc of docs) {
      for (const tag of doc.document_tags) {
        map.set(tag.id, (map.get(tag.id) ?? 0) + 1);
      }
    }
    return map;
  }, [docs]);

  const untaggedDocs = useMemo(
    () => docs.filter((doc) => doc.document_tags.length === 0),
    [docs],
  );

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
        <button
          className="btn btn--primary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "上傳中..." : "+ 上傳 PDF"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleUpload} />
      </div>

      {docs.length === 0 && <p className="empty-state">尚無文件，請上傳 PDF。</p>}

      {docs.length > 0 && (
        <div className="library-page">
          <section className="library-section">
            <h2 className="library-section__heading">最近閱讀</h2>
            <HeroShelf
              docs={recentDocs}
              thumbUrls={thumbUrls}
              onNavigate={(id) => nav(`/reader/${id}`)}
            />
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
