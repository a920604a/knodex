import { useEffect, useState } from "react";
import { createHighlight } from "../api/highlights";
import { listTags } from "../api/tags";
import type { Tag } from "../types";

interface Selection {
  text: string;
  page: number;
  start_offset: number;
  end_offset: number;
}

interface Props {
  documentId: string;
  selection: Selection;
  onClose: () => void;
  onCreated: () => void;
}

export default function HighlightModal({ documentId, selection, onClose, onCreated }: Props) {
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => { listTags().then(setTags); }, []);

  const handleSubmit = async () => {
    await createHighlight({
      document_id: documentId,
      text: selection.text,
      note: note || undefined,
      page: selection.page,
      start_offset: selection.start_offset,
      end_offset: selection.end_offset,
    });
    onCreated();
    onClose();
  };

  const toggleTag = (id: string) =>
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
    }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, width: 400 }}>
        <h3 style={{ margin: "0 0 12px" }}>新增畫線</h3>
        <blockquote style={{ background: "#fffde7", padding: 8, borderLeft: "3px solid #fbc02d", margin: "0 0 12px" }}>
          {selection.text}
        </blockquote>
        <label style={{ fontSize: 13 }}>筆記</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ width: "100%", marginTop: 4, marginBottom: 12, fontSize: 13 }}
          rows={3}
          placeholder="加上筆記（選填）"
        />
        {tags.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13 }}>標籤</label>
            <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tags.map((t) => (
                <span
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  style={{
                    cursor: "pointer", fontSize: 12, padding: "2px 8px", borderRadius: 12,
                    background: selectedTagIds.includes(t.id) ? "#1976d2" : "#e0e0e0",
                    color: selectedTagIds.includes(t.id) ? "#fff" : "#333",
                  }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose}>取消</button>
          <button onClick={handleSubmit} style={{ background: "#1976d2", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px" }}>
            建立
          </button>
        </div>
      </div>
    </div>
  );
}
