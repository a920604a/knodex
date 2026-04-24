import { useState } from "react";
import { apiJson } from "../lib/api";

interface Source {
  type: "chunk" | "highlight";
  document_id: string;
  page: number;
  content: string;
}

interface QueryResponse {
  answer: string;
  sources: Source[];
}

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError("");
    setLoading(true);
    try {
      const data = await apiJson<QueryResponse>("/query", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      setResult(data);
    } catch (err: any) {
      if (err.status === 429) {
        setError("Daily query limit reached. Try again tomorrow.");
      } else {
        setError(err.message || "Query failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <h1>AI 問答</h1>
      <form onSubmit={handleSubmit} className="search-bar">
        <input
          className="input"
          placeholder="問任何關於你的文件的問題…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? "思考中…" : "送出"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {result && (
        <div>
          <div className="card" style={{ marginBottom: "var(--space-md)" }}>
            <p className="query-answer">{result.answer}</p>
          </div>
          {result.sources.length > 0 && (
            <div className="query-sources">
              <h2>來源</h2>
              {result.sources.map((s, i) => (
                <div key={i} className="card card--sm">
                  <div className="query-source__meta">
                    <span className={s.type === "highlight" ? "badge--warning" : "tag-chip"}>
                      {s.type === "highlight" ? "你的畫線" : "文件"}
                    </span>
                    <span className="query-source__page">第 {s.page} 頁</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "var(--font-size-callout)" }}>{s.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
