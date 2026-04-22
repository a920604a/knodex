import api from "./client";
import type { Document } from "../types";

export const listDocuments = () => api.get<Document[]>("/documents").then((r) => r.data);

export const getDocument = (id: string) => api.get<Document>(`/documents/${id}`).then((r) => r.data);

export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<Document>("/documents", form).then((r) => r.data);
};

export const updateProgress = (id: string, page?: number, status?: string) =>
  api.post<Document>(`/documents/${id}/progress`, { page, status }).then((r) => r.data);
