import { useEffect, useState } from "react";
import { createTag, deleteTag, getTagTree } from "../api/tags";
import type { TagTree } from "../types";

function TagNode({ tag, onDelete }: { tag: TagTree; onDelete: (id: string, hasChildren: boolean) => void }) {
  return (
    <li>
      <span>{tag.name}</span>
      <button
        className="btn btn--ghost"
        style={{ color: "#ff3b30" }}
        onClick={() => onDelete(tag.id, tag.children.length > 0)}
      >
        ✕
      </button>
      {tag.children.length > 0 && (
        <ul className="tag-tree">
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
    await deleteTag(id, cascade || hasChildren);
    load();
  };

  return (
    <div className="page-content">
      <h2>標籤管理</h2>
      <div className="tag-create">
        <input
          className="input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新標籤名稱"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button className="btn btn--primary" onClick={handleCreate}>新增</button>
      </div>
      <ul className="tag-tree">
        {tree.map((t) => <TagNode key={t.id} tag={t} onDelete={handleDelete} />)}
      </ul>
    </div>
  );
}
