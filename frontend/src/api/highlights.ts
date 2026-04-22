import api from "./client";
import type { Highlight } from "../types";

interface CreateHighlight {
  document_id: string;
  text: string;
  note?: string;
  page: number;
  start_offset: number;
  end_offset: number;
}

export const listHighlights = (params?: {
  document_id?: string;
  q?: string;
  tag?: string;
  tag_id?: string;
}) => api.get<Highlight[]>("/highlights", { params }).then((r) => r.data);

export const getHighlight = (id: string) =>
  api.get<Highlight>(`/highlights/${id}`).then((r) => r.data);

export const createHighlight = (body: CreateHighlight) =>
  api.post<Highlight>("/highlights", body).then((r) => r.data);

export const patchHighlight = (id: string, note: string | null) =>
  api.patch<Highlight>(`/highlights/${id}`, { note }).then((r) => r.data);

export const deleteHighlight = (id: string) => api.delete(`/highlights/${id}`);

export const addTags = (highlightId: string, tagIds: string[]) =>
  api.post<Highlight>(`/highlights/${highlightId}/tags`, { tag_ids: tagIds }).then((r) => r.data);

export const removeTag = (highlightId: string, tagId: string) =>
  api.delete(`/highlights/${highlightId}/tags/${tagId}`);
