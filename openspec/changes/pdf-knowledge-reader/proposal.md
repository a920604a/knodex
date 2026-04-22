## Why

Developers who read technical PDFs have no good self-hosted tool to turn highlights into a searchable, structured knowledge base — notes scatter across files, bookmarks go stale, and nothing is queryable. This system solves that by treating each highlight as a first-class knowledge unit, stored locally, fully searchable, and schema-compatible with future RAG pipelines.

## What Changes

- **New**: PDF upload, storage, and metadata tracking (title, status, reading progress)
- **New**: In-browser PDF viewer with page tracking and text selection
- **New**: Highlight creation from selected text, with per-page position offsets and editable notes
- **New**: Hierarchical tag system with parent–child relationships, attachable to highlights
- **New**: Full-text search across document titles and highlight text/notes, with tag filtering
- **New**: Async ingestion pipeline — on upload, PDFs are chunked (500 tokens, 100-token overlap) and stored in `document_chunks` for future vector search
- **New**: PostgreSQL schema designed for pgvector compatibility (`embeddings` table placeholder)

## Capabilities

### New Capabilities

- `document-management`: Upload, list, and track PDF documents with reading status and progress
- `pdf-reader`: Render PDFs in-browser, track current page, enable text selection for highlighting
- `highlight-management`: Create, edit, and delete highlights as knowledge units with page/offset metadata and notes
- `tag-system`: Create and manage hierarchical tags; attach multiple tags to highlights
- `search`: Full-text search across documents and highlights; filter highlights by tag
- `ingestion-pipeline`: Async background worker that extracts text, cleans, chunks, and stores PDF content in `document_chunks`

### Modified Capabilities

_(none — this is a greenfield system)_

## Impact

- **New backend**: FastAPI application with service-layer architecture
- **New database**: PostgreSQL with tables: `documents`, `highlights`, `tags`, `highlight_tags`, `document_chunks`, `embeddings` (schema-only, unused until RAG phase)
- **New frontend**: React application with PDF.js or equivalent viewer
- **New worker**: Background job processor (e.g., Celery or FastAPI BackgroundTasks) for PDF ingestion
- **Storage**: Local filesystem or NAS mount for PDF files; path stored in `documents.file_path`
- **Dependencies**: PyMuPDF (text extraction), tiktoken or similar (chunking), asyncpg/SQLAlchemy (DB), pdf.js or react-pdf (viewer)
- **Future extension points**: pgvector for `embeddings` table, embedding worker, RAG query service
