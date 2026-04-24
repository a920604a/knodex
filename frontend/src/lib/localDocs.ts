import type { Document } from "../types";

export interface LocalDoc {
  id: string;
  title: string;
  size: number;
  addedAt: string;
  page: number;
  progress: number;
}

const STORAGE_KEY = "knodex-reader-docs";

// In-memory blob URL cache — cleared on every page refresh (intentional)
const blobCache = new Map<string, string>();

function load(): LocalDoc[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(docs: LocalDoc[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

function stem(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export function addDoc(file: File): LocalDoc {
  const id = crypto.randomUUID();
  const doc: LocalDoc = {
    id,
    title: stem(file.name),
    size: file.size,
    addedAt: new Date().toISOString(),
    page: 1,
    progress: 0,
  };
  blobCache.set(id, URL.createObjectURL(file));
  persist([...load(), doc]);
  return doc;
}

export function listDocs(): LocalDoc[] {
  return load();
}

export function deleteDoc(id: string): void {
  const url = blobCache.get(id);
  if (url) URL.revokeObjectURL(url);
  blobCache.delete(id);
  persist(load().filter((d) => d.id !== id));
}

export function getBlobUrl(id: string): string | null {
  return blobCache.get(id) ?? null;
}

export function restoreBlob(id: string, file: File): string {
  const old = blobCache.get(id);
  if (old) URL.revokeObjectURL(old);
  const url = URL.createObjectURL(file);
  blobCache.set(id, url);
  return url;
}

export function saveProgress(id: string, page: number, progress: number): void {
  persist(load().map((d) => (d.id === id ? { ...d, page, progress } : d)));
}

export function toDocument(d: LocalDoc): Document {
  return {
    id: d.id,
    title: d.title,
    file_path: "",
    status: d.progress >= 1 ? "done" : d.progress > 0 ? "reading" : "unread",
    ingestion_status: "completed",
    progress: d.progress,
    total_pages: null,
    thumb_path: null,
    created_at: d.addedAt,
    updated_at: d.addedAt,
    document_tags: [],
  };
}
