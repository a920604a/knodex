import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDocuments, uploadDocument } from "../api/documents";
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Knodex</h1>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "上傳中..." : "+ 上傳 PDF"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleUpload} />
      </div>

      {docs.length === 0 && <p style={{ color: "#888" }}>尚無文件，請上傳 PDF。</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {docs.map((doc) => (
          <li
            key={doc.id}
            onClick={() => nav(`/reader/${doc.id}`)}
            style={{
              padding: "12px 16px",
              marginBottom: 8,
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{doc.title}</strong>
              <span style={{ marginLeft: 12, fontSize: 12, color: "#888" }}>{doc.status}</span>
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              {Math.round(doc.progress * 100)}%
              {doc.total_pages && ` / ${doc.total_pages} 頁`}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
