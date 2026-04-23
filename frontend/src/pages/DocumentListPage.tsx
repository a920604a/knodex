import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteDocument, listDocuments, uploadDocument } from "../api/documents";
import type { Document } from "../types";

export default function DocumentListPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const load = () => listDocuments().then(setDocs);
  useEffect(() => { load(); }, []);

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

      <ul className="doc-list">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="card card--clickable doc-card"
            onClick={() => nav(`/reader/${doc.id}`)}
          >
            <div>
              <span className="doc-card__title">{doc.title}</span>
              <span className="doc-card__status">{doc.status}</span>
            </div>
            <div className="doc-card__progress">
              {Math.round(doc.progress * 100)}%
              {doc.total_pages && ` / ${doc.total_pages} 頁`}
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
          </li>
        ))}
      </ul>
    </div>
  );
}
