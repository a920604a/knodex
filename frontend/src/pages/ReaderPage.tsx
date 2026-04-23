import { useCallback, useEffect, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useNavigate, useParams } from "react-router-dom";
import { getDocument, updateProgress } from "../api/documents";
import type { Document } from "../types";
import HighlightModal from "../components/HighlightModal";
import HighlightSidebar from "../components/HighlightSidebar";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

const API_URL = import.meta.env.VITE_API_URL ?? "";

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
  const [pdfError, setPdfError] = useState(false);
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
    setSelection({ text, page: currentPage, start_offset: range.startOffset, end_offset: range.endOffset });
    setShowModal(true);
  };

  if (!doc) return <div className="page-content">載入中...</div>;

  return (
    <div className="reader-layout">
      <div className="toolbar">
        <button className="btn" onClick={() => nav("/")}>← 返回</button>
        <span className="toolbar__title">{doc.title}</span>
        <input className="input" value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="搜尋畫線..." style={{ width: 140 }} />
        <input className="input" value={filterTag} onChange={(e) => setFilterTag(e.target.value)} placeholder="知識標籤篩選" style={{ width: 120 }} />
      </div>

      <div className="reader-body">
        <div className="reader-pdf">
          <div className="page-controls">
            <button className="btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>‹ 上頁</button>
            <input
              className="input"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToPage(Number(pageInput))}
              style={{ width: 48, textAlign: "center" }}
            />
            <span>/ {numPages || "?"}</span>
            <button className="btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages}>下頁 ›</button>
          </div>

          {pdfError && (
            <div className="pdf-error">
              PDF 檔案無法載入，可能已從儲存空間中刪除。請重新上傳。
            </div>
          )}
          <PDFDocument
            file={`${API_URL}/documents/${id}/file`}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPdfError(false); }}
            onLoadError={(err) => { console.error("PDF load error", err); setPdfError(true); }}
          >
            <div onMouseUp={handleTextSelection}>
              <Page pageNumber={currentPage} width={680} renderTextLayer renderAnnotationLayer={false} />
            </div>
          </PDFDocument>
        </div>

        {id && (
          <div className="reader-inspector">
            <HighlightSidebar
              documentId={id}
              onPageJump={goToPage}
              filterTag={filterTag}
              filterQ={filterQ}
              key={highlightKey}
            />
          </div>
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
