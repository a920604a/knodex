import { useCallback, useEffect, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useNavigate, useParams } from "react-router-dom";
import { getDocument, updateProgress } from "../api/documents";
import type { Document } from "../types";
import HighlightModal from "../components/HighlightModal";
import HighlightSidebar from "../components/HighlightSidebar";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface SelectionInfo {
  text: string;
  page: number;
  start_offset: number;
  end_offset: number;
}

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [highlightKey, setHighlightKey] = useState(0);
  const [filterTag, setFilterTag] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    getDocument(id).then(setDoc);
  }, [id]);

  const syncProgress = useCallback(
    (page: number, isLast: boolean) => {
      if (!id) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateProgress(id, page, isLast ? "done" : "reading");
      }, 2000);
    },
    [id]
  );

  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, numPages));
    setCurrentPage(p);
    setPageInput(String(p));
    syncProgress(p, p === numPages);
  };

  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;
    const range = sel.getRangeAt(0);
    setSelection({
      text,
      page: currentPage,
      start_offset: range.startOffset,
      end_offset: range.endOffset,
    });
    setShowModal(true);
  };

  if (!doc) return <div style={{ padding: 24 }}>載入中...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #ddd", gap: 12 }}>
        <button onClick={() => nav("/")} style={{ fontSize: 13 }}>← 返回</button>
        <strong style={{ flex: 1 }}>{doc.title}</strong>
        <input
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          placeholder="搜尋畫線..."
          style={{ fontSize: 12, padding: "3px 8px", width: 140 }}
        />
        <input
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          placeholder="標籤篩選"
          style={{ fontSize: 12, padding: "3px 8px", width: 100 }}
        />
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* PDF viewer */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Page controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>‹ 上頁</button>
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToPage(Number(pageInput))}
              style={{ width: 48, textAlign: "center" }}
            />
            <span style={{ fontSize: 13, color: "#555" }}>/ {numPages || "?"}</span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages}>下頁 ›</button>
          </div>

          <PDFDocument
            file={`${API_URL}/documents/${id}/file`}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); }}
            onLoadError={(err) => console.error("PDF load error", err)}
          >
            <div onMouseUp={handleTextSelection}>
              <Page
                pageNumber={currentPage}
                width={680}
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />
            </div>
          </PDFDocument>
        </div>

        {/* Sidebar */}
        {id && (
          <HighlightSidebar
            documentId={id}
            onPageJump={goToPage}
            filterTag={filterTag}
            filterQ={filterQ}
            key={highlightKey}
          />
        )}
      </div>

      {showModal && selection && id && (
        <HighlightModal
          documentId={id}
          selection={selection}
          onClose={() => setShowModal(false)}
          onCreated={() => setHighlightKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
