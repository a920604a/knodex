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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <h2>Ask Your Knowledge Base</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          style={{ flex: 1 }}
          placeholder="Ask anything about your documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div>
          <div style={{ background: "var(--color-surface, #f5f5f5)", padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{result.answer}</p>
          </div>
          {result.sources.length > 0 && (
            <div>
              <h4>Sources</h4>
              {result.sources.map((s, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--color-border, #ddd)",
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: s.type === "highlight" ? "#fef3c7" : "#dbeafe",
                        color: s.type === "highlight" ? "#92400e" : "#1e40af",
                      }}
                    >
                      {s.type === "highlight" ? "Your Highlight" : "Document"}
                    </span>
                    <span style={{ fontSize: 12, color: "#666" }}>Page {s.page}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13 }}>{s.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
