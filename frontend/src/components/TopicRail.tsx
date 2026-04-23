import type { DocumentTag } from "../types";

export default function TopicRail({
  tags,
  countByTagId,
  untaggedCount,
  selectedTagId,
  onSelect,
}: {
  tags: DocumentTag[];
  countByTagId: Map<string, number>;
  untaggedCount: number;
  selectedTagId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <nav className="topic-rail">
      <button
        type="button"
        className={`topic-rail__item${selectedTagId === null ? " topic-rail__item--active" : ""}`}
        onClick={() => onSelect(null)}
      >
        <span className="topic-rail__name">全部</span>
        <span className="topic-rail__count">{countByTagId.size > 0 ? [...countByTagId.values()].reduce((a, b) => a + b, 0) : 0}</span>
      </button>

      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className={`topic-rail__item${selectedTagId === tag.id ? " topic-rail__item--active" : ""}`}
          onClick={() => onSelect(tag.id)}
        >
          <span className="topic-rail__name">{tag.name}</span>
          <span className="topic-rail__count">{countByTagId.get(tag.id) ?? 0}</span>
        </button>
      ))}

      {untaggedCount > 0 && (
        <button
          type="button"
          className={`topic-rail__item${selectedTagId === "untagged" ? " topic-rail__item--active" : ""}`}
          onClick={() => onSelect("untagged")}
        >
          <span className="topic-rail__name">未歸類</span>
          <span className="topic-rail__count">{untaggedCount}</span>
        </button>
      )}
    </nav>
  );
}
