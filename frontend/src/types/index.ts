export interface Document {
  id: string;
  title: string;
  file_path: string;
  status: "unread" | "reading" | "done";
  progress: number;
  total_pages: number | null;
  created_at: string;
  updated_at: string;
  document_tags: DocumentTag[];
}

export interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface TagTree extends Tag {
  children: TagTree[];
}

export interface DocumentTag {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface DocumentTagTree extends DocumentTag {
  children: DocumentTagTree[];
}

export interface Highlight {
  id: string;
  document_id: string;
  text: string;
  note: string | null;
  page: number;
  start_offset: number;
  end_offset: number;
  created_at: string;
  tags: Tag[];
}

export interface SearchResult {
  documents: Document[];
  highlights: Highlight[];
}
