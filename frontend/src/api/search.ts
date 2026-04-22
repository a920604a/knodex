import api from "./client";
import type { SearchResult } from "../types";

export const search = (q: string) =>
  api.get<SearchResult>("/search", { params: { q } }).then((r) => r.data);
