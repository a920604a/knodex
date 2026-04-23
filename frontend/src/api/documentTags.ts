import api from "./client";
import type { DocumentTag, DocumentTagTree } from "../types";

export const listDocumentTags = () =>
  api.get<DocumentTag[]>("/document-tags").then((r) => r.data);

export const getDocumentTagTree = () =>
  api.get<DocumentTagTree[]>("/document-tags/tree").then((r) => r.data);

export const createDocumentTag = (name: string, parent_id?: string) =>
  api.post<DocumentTag>("/document-tags", { name, parent_id }).then((r) => r.data);

export const deleteDocumentTag = (id: string, cascade = false) =>
  api.delete(`/document-tags/${id}`, { params: { cascade } });
