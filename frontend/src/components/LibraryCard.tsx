import { useState } from "react";
import type { Document, DocumentTag } from "../types";
import TopicDropdown from "./TopicDropdown";

function titleToHue(title: string): number {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

export default function LibraryCard({
  doc,
  thumbUrl,
  allTags,
  isBusy,
  onToggleTag,
  onDelete,
  onClick,
}: {
  doc: Document;
  thumbUrl: string | null;
  allTags: DocumentTag[];
  isBusy: boolean;
  onToggleTag: (tag: DocumentTag) => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const hue = titleToHue(doc.title);
  const assignedTagIds = new Set(doc.document_tags.map((t) => t.id));
  const progress = Math.round(doc.progress * 100);
  const showImg = thumbUrl && !imgFailed;

  return (
    <div className="library-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      <div className="library-card__cover-wrap">
        {showImg ? (
          <img
            className="library-card__cover-img"
            src={thumbUrl}
            alt={doc.title}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="library-card__cover-fallback"
            style={{ background: `hsl(${hue}, 55%, 68%)` }}
          >
            <span className="library-card__cover-initial">
              {doc.title.trim()[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        )}

        <div className="library-card__actions" onClick={(e) => e.stopPropagation()}>
          <div>
            <TopicDropdown
              allTags={allTags}
              assignedTagIds={assignedTagIds}
              onToggle={onToggleTag}
              disabled={isBusy}
            />
          </div>
          <button
            type="button"
            className="library-card__action-btn library-card__action-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            刪除
          </button>
        </div>
      </div>

      <div className="library-card__meta">
        <span className="library-card__title">{doc.title}</span>
        <div className="library-card__progress-track">
          <div
            className="library-card__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="library-card__pct">{progress}%</span>
        {doc.document_tags.length > 0 && (
          <div className="library-card__tags">
            {doc.document_tags.slice(0, 2).map((tag) => (
              <span key={tag.id} className="tag-chip tag-chip--selected" style={{ fontSize: "11px", padding: "1px 6px" }}>
                {tag.name}
              </span>
            ))}
            {doc.document_tags.length > 2 && (
              <span className="tag-chip" style={{ fontSize: "11px", padding: "1px 6px" }}>
                +{doc.document_tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
