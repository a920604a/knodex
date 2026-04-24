import api from "./client";
import type { Document } from "../types";

export const listDocuments = (documentTagId?: string) =>
  api.get<Document[]>("/documents", {
    params: documentTagId ? { document_tag_id: documentTagId } : undefined,
  }).then((r) => r.data);

export const getDocument = (id: string) => api.get<Document>(`/documents/${id}`).then((r) => r.data);

export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<Document>("/documents", form).then((r) => r.data);
};

export const updateProgress = (id: string, page?: number, status?: string) =>
  api.post<Document>(`/documents/${id}/progress`, { page, status }).then((r) => r.data);

export const deleteDocument = (id: string) =>
  api.delete(`/documents/${id}`);

export const addDocumentTag = (id: string, tagId: string) =>
  api.post<Document>(`/documents/${id}/tags`, { tag_id: tagId }).then((r) => r.data);

export const removeDocumentTag = (id: string, tagId: string) =>
  api.delete(`/documents/${id}/tags/${tagId}`);

export const getDocumentThumbUrl = (id: string): Promise<string> =>
  api.get<{ url: string }>(`/documents/${id}/thumb-url`).then((r) => r.data.url);
