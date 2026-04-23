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
    <div className="page-content">
      <h2>搜尋</h2>
      <div className="search-bar">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="輸入關鍵字..."
        />
        <button className="btn btn--primary" onClick={handleSearch}>搜尋</button>
      </div>

      {result && (
        <>
          <h3>文件 ({result.documents.length})</h3>
          {result.documents.length === 0
            ? <p className="empty-state">無結果</p>
            : (
              <ul className="doc-list">
                {result.documents.map((d) => (
                  <li
                    key={d.id}
                    className="card card--clickable"
                    onClick={() => nav(`/reader/${d.id}`)}
                  >
                    {d.title}
                  </li>
                ))}
              </ul>
            )}

          <h3>畫線知識 ({result.highlights.length})</h3>
          {result.highlights.length === 0
            ? <p className="empty-state">無結果</p>
            : (
              <ul className="doc-list">
                {result.highlights.map((h) => (
                  <li
                    key={h.id}
                    className="highlight-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => nav(`/reader/${h.document_id}`)}
                  >
                    <div>
                      「{h.text}」
                      <span className="highlight-card__meta">p.{h.page}</span>
                    </div>
                    {h.note && <div className="highlight-card__note">{h.note}</div>}
                    {h.tags.length > 0 && (
                      <div className="highlight-card__tags">
                        {h.tags.map((t) => (
                          <span key={t.id} className="tag-chip">{t.name}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </>
      )}
    </div>
  );
}
