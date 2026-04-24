import type { Document, DocumentTag } from "../types";
import TopicDropdown from "./TopicDropdown";

export default function BookCard({
  doc,
  allTags,
  isBusy,
  onToggleTag,
  onDelete,
  onClick,
}: {
  doc: Document;
  allTags: DocumentTag[];
  isBusy: boolean;
  onToggleTag: (tag: DocumentTag) => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const assignedTagIds = new Set(doc.document_tags.map((t) => t.id));

  return (
    <li className="card card--clickable book-card" onClick={onClick}>
      <div className="book-card__top">
        <div className="book-card__info">
          <span className="book-card__title">{doc.title}</span>
          <span className="doc-card__status">{doc.status}</span>
          {doc.ingestion_status !== "completed" && (
            <span className={doc.ingestion_status === "failed" ? "badge--error" : "badge--warning"}>
              {doc.ingestion_status}
            </span>
          )}
        </div>
        <button
          className="btn btn--danger doc-card__delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          刪除
        </button>
      </div>

      <div className="book-card__progress-track">
        <div
          className="book-card__progress-bar"
          style={{ width: `${Math.round(doc.progress * 100)}%` }}
        />
      </div>

      <div className="doc-card__tags" onClick={(e) => e.stopPropagation()}>
        <div className="doc-card__tag-section">
          <TopicDropdown
            allTags={allTags}
            assignedTagIds={assignedTagIds}
            onToggle={onToggleTag}
            disabled={isBusy}
          />
          <div className="doc-card__tag-list">
            {doc.document_tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="tag-chip tag-chip--clickable tag-chip--selected"
                onClick={() => onToggleTag(tag)}
                disabled={isBusy}
              >
                {tag.name} ✕
              </button>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
