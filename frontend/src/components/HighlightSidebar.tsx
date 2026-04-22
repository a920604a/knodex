import { useEffect, useState } from "react";
import { deleteHighlight, listHighlights, patchHighlight } from "../api/highlights";
import type { Highlight } from "../types";

interface Props {
  documentId: string;
  onPageJump: (page: number) => void;
  filterTag: string;
  filterQ: string;
}

export default function HighlightSidebar({ documentId, onPageJump, filterTag, filterQ }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const load = () =>
    listHighlights({ document_id: documentId, tag: filterTag || undefined, q: filterQ || undefined }).then(setHighlights);

  useEffect(() => { load(); }, [documentId, filterTag, filterQ]);

  const handleDelete = async (id: string) => {
    await deleteHighlight(id);
    await load();
  };

  const handleSaveNote = async (id: string) => {
    await patchHighlight(id, editNote);
    setEditingId(null);
    await load();
  };

  return (
    <div style={{ width: 300, overflowY: "auto", borderLeft: "1px solid #ddd", padding: 12 }}>
      <h3 style={{ margin: "0 0 12px" }}>畫線 ({highlights.length})</h3>
      {highlights.map((h) => (
        <div key={h.id} style={{ marginBottom: 16, padding: 10, background: "#fffde7", borderRadius: 4 }}>
          <div
            style={{ cursor: "pointer", fontWeight: 500 }}
            onClick={() => onPageJump(h.page)}
          >
            「{h.text}」
            <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>p.{h.page}</span>
          </div>

          {h.tags.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {h.tags.map((t) => (
                <span key={t.id} style={{ fontSize: 11, background: "#e3f2fd", borderRadius: 3, padding: "1px 5px", marginRight: 4 }}>
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {editingId === h.id ? (
            <div style={{ marginTop: 6 }}>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                style={{ width: "100%", fontSize: 12 }}
                rows={3}
              />
              <button onClick={() => handleSaveNote(h.id)} style={{ fontSize: 11, marginRight: 4 }}>儲存</button>
              <button onClick={() => setEditingId(null)} style={{ fontSize: 11 }}>取消</button>
            </div>
          ) : (
            <div style={{ marginTop: 4, fontSize: 12, color: "#555" }}>
              {h.note || <em style={{ color: "#bbb" }}>無筆記</em>}
              <button
                onClick={() => { setEditingId(h.id); setEditNote(h.note || ""); }}
                style={{ fontSize: 10, marginLeft: 6, cursor: "pointer", border: "none", background: "none", color: "#1976d2" }}
              >
                編輯
              </button>
            </div>
          )}

          <button
            onClick={() => handleDelete(h.id)}
            style={{ fontSize: 10, marginTop: 4, cursor: "pointer", border: "none", background: "none", color: "#e53935" }}
          >
            刪除
          </button>
        </div>
      ))}
    </div>
  );
}
