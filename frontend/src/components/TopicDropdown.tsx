import { useEffect, useRef, useState } from "react";
import type { DocumentTag } from "../types";

export default function TopicDropdown({
  allTags,
  assignedTagIds,
  onToggle,
  disabled,
  align = "left",
}: {
  allTags: DocumentTag[];
  assignedTagIds: Set<string>;
  onToggle: (tag: DocumentTag) => void;
  disabled: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="topic-dropdown" ref={ref}>
      <button
        type="button"
        className="topic-dropdown__trigger"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        設定主題 ▾
      </button>
      {open && (
        <div className={`topic-dropdown__menu topic-dropdown__menu--${align}`}>
          <input
            className="input topic-dropdown__search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋主題..."
            autoFocus
          />
          <ul className="topic-dropdown__list">
            {filtered.map((tag) => (
              <li key={tag.id}>
                <label className="topic-dropdown__item">
                  <input
                    type="checkbox"
                    checked={assignedTagIds.has(tag.id)}
                    onChange={() => onToggle(tag)}
                  />
                  {tag.name}
                </label>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="topic-dropdown__empty">沒有符合的主題</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
