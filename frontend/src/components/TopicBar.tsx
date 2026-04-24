import type { DocumentTag } from "../types";

export default function TopicBar({
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
  const totalCount = [...countByTagId.values()].reduce((a, b) => a + b, 0);

  return (
    <nav className="topic-bar">
      <button
        type="button"
        className={`topic-bar__pill${selectedTagId === null ? " topic-bar__pill--active" : ""}`}
        onClick={() => onSelect(null)}
      >
        全部
        <span className="topic-bar__count">{totalCount}</span>
      </button>

      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className={`topic-bar__pill${selectedTagId === tag.id ? " topic-bar__pill--active" : ""}`}
          onClick={() => onSelect(tag.id)}
        >
          {tag.name}
          <span className="topic-bar__count">{countByTagId.get(tag.id) ?? 0}</span>
        </button>
      ))}

      {untaggedCount > 0 && (
        <button
          type="button"
          className={`topic-bar__pill${selectedTagId === "untagged" ? " topic-bar__pill--active" : ""}`}
          onClick={() => onSelect("untagged")}
        >
          未歸類
          <span className="topic-bar__count">{untaggedCount}</span>
        </button>
      )}
    </nav>
  );
}
