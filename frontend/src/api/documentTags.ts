import api from "./client";
import type { DocumentTag, DocumentTagTree } from "../types";

export const listDocumentTags = () =>
  api.get<DocumentTag[]>("/document-tags").then((r) => r.data);

export const getDocumentTagTree = () =>
  api.get<DocumentTagTree[]>("/document-tags/tree").then((r) => r.data);
