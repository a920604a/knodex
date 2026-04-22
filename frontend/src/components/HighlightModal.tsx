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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__title">新增畫線</div>
        <blockquote className="highlight-quote">{selection.text}</blockquote>

        <label className="form-label">筆記</label>
        <textarea
          className="textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="加上筆記（選填）"
        />

        {tags.length > 0 && (
          <>
            <label className="form-label">標籤</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 4 }}>
              {tags.map((t) => (
                <span
                  key={t.id}
                  className={`tag-chip tag-chip--clickable${selectedTagIds.includes(t.id) ? " tag-chip--selected" : ""}`}
                  onClick={() => toggleTag(t.id)}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="modal__actions">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn--primary" onClick={handleSubmit}>建立</button>
        </div>
      </div>
    </div>
  );
}
