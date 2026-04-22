import { useEffect, useState } from "react";
import { createTag, deleteTag, getTagTree } from "../api/tags";
import type { TagTree } from "../types";

function TagNode({ tag, onDelete }: { tag: TagTree; onDelete: (id: string, cascade: boolean) => void }) {
  return (
    <li>
      <span>{tag.name}</span>
      <button
        onClick={() => onDelete(tag.id, tag.children.length > 0)}
        style={{ fontSize: 10, marginLeft: 6, cursor: "pointer", border: "none", background: "none", color: "#e53935" }}
      >
        ✕
      </button>
      {tag.children.length > 0 && (
        <ul style={{ paddingLeft: 16 }}>
          {tag.children.map((c) => <TagNode key={c.id} tag={c} onDelete={onDelete} />)}
        </ul>
      )}
    </li>
  );
}

export default function TagManager() {
  const [tree, setTree] = useState<TagTree[]>([]);
  const [newName, setNewName] = useState("");

  const load = () => getTagTree().then(setTree);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTag(newName.trim());
    setNewName("");
    load();
  };

  const handleDelete = async (id: string, hasChildren: boolean) => {
    const cascade = hasChildren ? confirm("此標籤含子標籤，是否一併刪除？") : false;
    await deleteTag(id, cascade || hasChildren ? true : false);
    load();
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>標籤管理</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新標籤名稱"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          style={{ flex: 1, padding: "4px 8px" }}
        />
        <button onClick={handleCreate}>新增</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tree.map((t) => <TagNode key={t.id} tag={t} onDelete={handleDelete} />)}
      </ul>
    </div>
  );
}
