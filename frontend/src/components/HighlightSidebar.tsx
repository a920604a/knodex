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
    <>
      <div className="reader-inspector__title">畫線 ({highlights.length})</div>
      {highlights.map((h) => (
        <div key={h.id} className="highlight-card">
          <div className="highlight-card__quote" onClick={() => onPageJump(h.page)}>
            「{h.text}」
            <span className="highlight-card__meta">p.{h.page}</span>
          </div>

          {h.tags.length > 0 && (
            <div className="highlight-card__tags">
              {h.tags.map((t) => (
                <span key={t.id} className="tag-chip">{t.name}</span>
              ))}
            </div>
          )}

          {editingId === h.id ? (
            <div style={{ marginTop: 6 }}>
              <textarea
                className="textarea"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
              />
              <div className="highlight-card__actions">
                <button className="btn btn--primary" onClick={() => handleSaveNote(h.id)}>儲存</button>
                <button className="btn" onClick={() => setEditingId(null)}>取消</button>
              </div>
            </div>
          ) : (
            <div className="highlight-card__note">
              {h.note || <em style={{ color: "var(--color-tertiary-label)" }}>無筆記</em>}
              <button
                className="btn btn--ghost"
                onClick={() => { setEditingId(h.id); setEditNote(h.note || ""); }}
              >
                編輯
              </button>
            </div>
          )}

          <button className="btn btn--ghost" style={{ color: "#ff3b30" }} onClick={() => handleDelete(h.id)}>
            刪除
          </button>
        </div>
      ))}
    </>
  );
}
