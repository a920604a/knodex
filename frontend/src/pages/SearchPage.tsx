import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { search } from "../api/search";
import type { SearchResult } from "../types";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const nav = useNavigate();

  const handleSearch = async () => {
    if (!q.trim()) return;
    const data = await search(q.trim());
    setResult(data);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h2>搜尋</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="輸入關鍵字..."
          style={{ flex: 1, padding: "6px 10px" }}
        />
        <button onClick={handleSearch}>搜尋</button>
      </div>

      {result && (
        <>
          <h3>文件 ({result.documents.length})</h3>
          {result.documents.length === 0 ? <p style={{ color: "#888" }}>無結果</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {result.documents.map((d) => (
                <li
                  key={d.id}
                  onClick={() => nav(`/reader/${d.id}`)}
                  style={{ padding: "8px 12px", marginBottom: 4, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }}
                >
                  {d.title}
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ marginTop: 20 }}>畫線 ({result.highlights.length})</h3>
          {result.highlights.length === 0 ? <p style={{ color: "#888" }}>無結果</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {result.highlights.map((h) => (
                <li
                  key={h.id}
                  onClick={() => nav(`/reader/${h.document_id}`)}
                  style={{ padding: "8px 12px", marginBottom: 4, background: "#fffde7", borderRadius: 4, cursor: "pointer" }}
                >
                  <div>「{h.text}」<span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>p.{h.page}</span></div>
                  {h.note && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{h.note}</div>}
                  {h.tags.map((t) => (
                    <span key={t.id} style={{ fontSize: 11, background: "#e3f2fd", borderRadius: 3, padding: "1px 5px", marginRight: 4, marginTop: 4, display: "inline-block" }}>
                      {t.name}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
