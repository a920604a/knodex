import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDocumentTag,
  deleteDocument,
  listDocuments,
  removeDocumentTag,
  uploadDocument,
} from "../api/documents";
import { getDocumentTagTree } from "../api/documentTags";
import type { Document, DocumentTag, DocumentTagTree } from "../types";

function TopicDropdown({
  allTags,
  assignedTagIds,
  onToggle,
  disabled,
}: {
  allTags: DocumentTag[];
  assignedTagIds: Set<string>;
  onToggle: (tag: DocumentTag) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="topic-dropdown" ref={ref}>
      <button
        type="button"
        className="topic-dropdown__trigger"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        設定主題 ▾
      </button>
      {open && (
        <div className="topic-dropdown__menu">
          <input
            className="input topic-dropdown__search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋主題..."
            autoFocus
          />
          <ul className="topic-dropdown__list">
            {filtered.map((tag) => (
              <li key={tag.id}>
                <label className="topic-dropdown__item">
                  <input
                    type="checkbox"
                    checked={assignedTagIds.has(tag.id)}
                    onChange={() => onToggle(tag)}
                  />
                  {tag.name}
                </label>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="topic-dropdown__empty">沒有符合的主題</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function flattenTags(tree: unknown): DocumentTag[] {
  return asArray<DocumentTagTree>(tree).flatMap((tag) => [tag, ...flattenTags(tag.children)]);
}

function collectNodeCount(tag: DocumentTagTree, docsByTagId: Map<string, Document[]>) {
  const ids = new Set<string>();
  for (const doc of docsByTagId.get(tag.id) ?? []) ids.add(doc.id);
  for (const child of tag.children) {
    for (const id of collectNodeCount(child, docsByTagId).ids) ids.add(id);
  }
  return { count: ids.size, ids };
}

function TagGroup({
  tag,
  docsByTagId,
  openState,
  onToggle,
  renderDoc,
}: {
  tag: DocumentTagTree;
  docsByTagId: Map<string, Document[]>;
  openState: Record<string, boolean>;
  onToggle: (id: string) => void;
  renderDoc: (doc: Document) => ReactElement;
}) {
  const directDocs = docsByTagId.get(tag.id) ?? [];
  const { count } = collectNodeCount(tag, docsByTagId);
  const isOpen = openState[tag.id] ?? true;

  return (
    <section className="library-group">
      <button className="library-group__header" onClick={() => onToggle(tag.id)} type="button">
        <span className="library-group__title">📁 {tag.name}</span>
        <span className="library-group__meta">{count} {isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && (
        <div className="library-group__body">
          {directDocs.length > 0 && <ul className="doc-list">{directDocs.map(renderDoc)}</ul>}
          {tag.children.length > 0 && (
            <div className="library-group__children">
              {tag.children.map((child) => (
                <TagGroup
                  key={child.id}
                  tag={child}
                  docsByTagId={docsByTagId}
                  openState={openState}
                  onToggle={onToggle}
                  renderDoc={renderDoc}
                />
              ))}
            </div>
          )}
          {directDocs.length === 0 && tag.children.length === 0 && (
            <p className="empty-state">此文件主題目前沒有書。</p>
          )}
        </div>
      )}
    </section>
  );
}

export default function DocumentListPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [tagTree, setTagTree] = useState<DocumentTagTree[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyDocs, setBusyDocs] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const load = async () => {
    const [documents, tree] = await Promise.all([listDocuments(), getDocumentTagTree()]);
    setDocs(asArray<Document>(documents));
    setTagTree(asArray<DocumentTagTree>(tree));
  };

  useEffect(() => {
    load();
  }, []);

  const allTags = useMemo(() => flattenTags(tagTree), [tagTree]);
  const recentDocs = useMemo(
    () => [...docs].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 5),
    [docs],
  );
  const docsByTagId = useMemo(() => {
    const map = new Map<string, Document[]>();
    for (const doc of docs) {
      for (const tag of doc.document_tags) {
        const existing = map.get(tag.id) ?? [];
        existing.push(doc);
        map.set(tag.id, existing);
      }
    }
    return map;
  }, [docs]);
  const untaggedDocs = useMemo(
    () => docs.filter((doc) => doc.document_tags.length === 0),
    [docs],
  );

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

  const handleGroupToggle = (id: string) => {
    setOpenGroups((current) => ({ ...current, [id]: !(current[id] ?? true) }));
  };

  const mutateDocTags = async (docId: string, mutate: () => Promise<unknown>) => {
    if (busyDocs[docId]) return;
    setBusyDocs((current) => ({ ...current, [docId]: true }));
    try {
      await mutate();
      await load();
    } finally {
      setBusyDocs((current) => ({ ...current, [docId]: false }));
    }
  };

  const handleToggleTag = async (doc: Document, tag: DocumentTag) => {
    const isAssigned = doc.document_tags.some((assignedTag) => assignedTag.id === tag.id);
    await mutateDocTags(doc.id, () =>
      isAssigned ? removeDocumentTag(doc.id, tag.id) : addDocumentTag(doc.id, tag.id),
    );
  };

  const renderDocCard = (doc: Document) => {
    const assignedTagIds = new Set(doc.document_tags.map((tag) => tag.id));
    const isBusy = busyDocs[doc.id] ?? false;

    return (
      <li
        key={doc.id}
        className="card card--clickable doc-card doc-card--stacked"
        onClick={() => nav(`/reader/${doc.id}`)}
      >
        <div className="doc-card__top">
          <div className="doc-card__summary">
            <div>
              <span className="doc-card__title">{doc.title}</span>
              <span className="doc-card__status">{doc.status}</span>
            </div>
            <div className="doc-card__progress">
              {Math.round(doc.progress * 100)}%
              {doc.total_pages && ` / ${doc.total_pages} 頁`}
            </div>
          </div>
          <button
            className="btn btn--danger doc-card__delete"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`刪除「${doc.title}」？`)) {
                deleteDocument(doc.id).then(load);
              }
            }}
          >
            刪除
          </button>
        </div>

        <div className="doc-card__tags" onClick={(e) => e.stopPropagation()}>
          <div className="doc-card__tag-section">
            <TopicDropdown
              allTags={allTags}
              assignedTagIds={assignedTagIds}
              onToggle={(tag) => void handleToggleTag(doc, tag)}
              disabled={isBusy}
            />
            <div className="doc-card__tag-list">
              {doc.document_tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="tag-chip tag-chip--clickable tag-chip--selected"
                  onClick={() => void handleToggleTag(doc, tag)}
                  disabled={isBusy}
                >
                  {tag.name} ✕
                </button>
              ))}
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="page-content">
      <div className="doc-list__header">
        <h1>文件庫</h1>
        <button className="btn btn--primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "上傳中..." : "+ 上傳 PDF"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleUpload} />
      </div>

      {docs.length === 0 && <p className="empty-state">尚無文件，請上傳 PDF。</p>}

      {docs.length > 0 && (
        <div className="library-layout">
          <section className="library-section">
            <div className="library-section__header">
              <h2>最近閱讀</h2>
              <span className="library-section__hint">依更新時間排序的 pinned 捷徑</span>
            </div>
            <ul className="doc-list">{recentDocs.map(renderDocCard)}</ul>
          </section>

          <section className="library-section">
            <div className="library-section__header">
              <h2>主題書架</h2>
              <span className="library-section__hint">書的主題直接在書卡上選，這裡依主題瀏覽</span>
            </div>
            <div className="library-groups">
              {tagTree.map((tag) => (
                <TagGroup
                  key={tag.id}
                  tag={tag}
                  docsByTagId={docsByTagId}
                  openState={openGroups}
                  onToggle={handleGroupToggle}
                  renderDoc={renderDocCard}
                />
              ))}
              <section className="library-group">
                <button
                  className="library-group__header"
                  onClick={() => handleGroupToggle("untagged")}
                  type="button"
                >
                  <span className="library-group__title">📁 未歸類</span>
                  <span className="library-group__meta">
                    {untaggedDocs.length} {(openGroups.untagged ?? true) ? "▼" : "▶"}
                  </span>
                </button>
                {(openGroups.untagged ?? true) && (
                  <div className="library-group__body">
                    {untaggedDocs.length > 0 ? (
                      <ul className="doc-list">{untaggedDocs.map(renderDocCard)}</ul>
                    ) : (
                      <p className="empty-state">目前所有書都已歸入文件主題。</p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
