import api from "./client";
import type { Tag, TagTree } from "../types";

export const listTags = () => api.get<Tag[]>("/tags").then((r) => r.data);

export const getTagTree = () => api.get<TagTree[]>("/tags/tree").then((r) => r.data);

export const createTag = (name: string, parent_id?: string) =>
  api.post<Tag>("/tags", { name, parent_id }).then((r) => r.data);

export const deleteTag = (id: string, cascade = false) =>
  api.delete(`/tags/${id}`, { params: { cascade } });
