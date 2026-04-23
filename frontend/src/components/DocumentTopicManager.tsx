import { useEffect, useMemo, useState } from "react";
import {
  createDocumentTag,
  deleteDocumentTag,
  getDocumentTagTree,
  listDocumentTags,
} from "../api/documentTags";
import type { DocumentTag, DocumentTagTree } from "../types";

function TopicNode({
  tag,
  onDelete,
}: {
  tag: DocumentTagTree;
  onDelete: (id: string, hasChildren: boolean) => void;
}) {
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
          {tag.children.map((child) => (
            <TopicNode key={child.id} tag={child} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function DocumentTopicManager() {
  const [tree, setTree] = useState<DocumentTagTree[]>([]);
  const [flatTags, setFlatTags] = useState<DocumentTag[]>([]);
  const [newName, setNewName] = useState("");
  const [parentId, setParentId] = useState("");

  const load = async () => {
    const [treeData, flatData] = await Promise.all([getDocumentTagTree(), listDocumentTags()]);
    setTree(Array.isArray(treeData) ? treeData : []);
    setFlatTags(Array.isArray(flatData) ? flatData : []);
  };

  useEffect(() => {
    load();
  }, []);

  const parentOptions = useMemo(() => flatTags, [flatTags]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDocumentTag(newName.trim(), parentId || undefined);
    setNewName("");
    setParentId("");
    await load();
  };

  const handleDelete = async (id: string, hasChildren: boolean) => {
    const cascade = hasChildren ? confirm("此文件主題含子主題，是否一併刪除？") : false;
    await deleteDocumentTag(id, cascade || hasChildren);
    await load();
  };

  return (
    <div className="page-content">
      <h2>文件主題管理</h2>
      <p className="empty-state" style={{ paddingTop: 0 }}>
        文件主題是用來幫你找書，不是用來標記畫線知識點。
      </p>
      <div className="tag-create">
        <input
          className="input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新增文件主題"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">根主題</option>
          {parentOptions.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <button className="btn btn--primary" onClick={handleCreate}>新增主題</button>
      </div>
      <ul className="tag-tree">
        {tree.map((tag) => (
          <TopicNode key={tag.id} tag={tag} onDelete={handleDelete} />
        ))}
      </ul>
    </div>
  );
}
