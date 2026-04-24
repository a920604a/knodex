import { useCallback, useEffect, useRef, useState } from "react";
import { Viewer, Worker, ScrollMode } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import { scrollModePlugin } from "@react-pdf-viewer/scroll-mode";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/search/lib/styles/index.css";
import { useNavigate, useParams } from "react-router-dom";
import { getDocument, updateProgress } from "../api/documents";
import { apiFetch } from "../lib/api";
import type { Document } from "../types";
import HighlightModal from "../components/HighlightModal";
import HighlightSidebar from "../components/HighlightSidebar";
import { isReaderMode } from "../lib/mode";
import * as localDocs from "../lib/localDocs";

interface SelectionInfo {
  text: string;
  page: number;
  start_offset: number;
  end_offset: number;
}

function FloatingControls({
  visible,
  currentPage,
  numPages,
  isContinuous,
  onExit,
  onToggleContinuous,
  onPageChange,
}: {
  visible: boolean;
  currentPage: number;
  numPages: number;
  isContinuous: boolean;
  onExit: () => void;
  onToggleContinuous: () => void;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className={`floating-controls${visible ? "" : " floating-controls--hidden"}`}>
      <button className="btn floating-controls__exit" onClick={onExit}>
        ✕ 退出沉浸
      </button>
      <div className="floating-controls__page">
        <button className="btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1 || isContinuous}>‹</button>
        <span>{currentPage} / {numPages || "?"}</span>
        <button className="btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= numPages || isContinuous}>›</button>
      </div>
      <button
        className={`btn${isContinuous ? " btn--primary" : ""}`}
        onClick={onToggleContinuous}
        title="切換連續頁 (C)"
      >
        {isContinuous ? "連續頁" : "單頁"}
      </button>
    </div>
  );
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

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isContinuous, setIsContinuous] = useState(true);
  const [isImmersive, setIsImmersive] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showInspector, setShowInspector] = useState(false);

  // Reader mode: blob URL state (may be null after page refresh)
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(
    () => (isReaderMode && id ? localDocs.getBlobUrl(id) : null)
  );
  const localDocData = isReaderMode && id
    ? localDocs.listDocs().find((d) => d.id === id) ?? null
    : null;
  const reloadFileRef = useRef<HTMLInputElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { jumpToPage } = pageNavigationPluginInstance;

  const scrollModePluginInstance = scrollModePlugin();
  const { switchScrollMode } = scrollModePluginInstance;

  const zoomPluginInstance = zoomPlugin();
  const { ZoomInButton, ZoomOutButton, CurrentScale } = zoomPluginInstance;

  const searchPluginInstance = searchPlugin();
  const { ShowSearchPopoverButton } = searchPluginInstance;

  // Full mode: load document metadata
  useEffect(() => {
    if (!id || isReaderMode) return;
    getDocument(id).then(setDoc);
  }, [id]);

  // Full mode: fetch presigned PDF URL
  useEffect(() => {
    if (!id || isReaderMode) return;
    apiFetch(`/documents/${id}/file-url`)
      .then((r) => r.json())
      .then((data: { url: string }) => setPdfUrl(data.url));
  }, [id]);

  const syncProgress = useCallback(
    (page: number, isLast: boolean) => {
      if (!id) return;
      if (isReaderMode) {
        localDocs.saveProgress(id, page, isLast ? 1 : numPages > 0 ? page / numPages : 0);
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateProgress(id, page, isLast ? "done" : "reading");
      }, 2000);
    },
    [id, numPages]
  );

  const goToPage = useCallback(
    (page: number) => {
      const p = Math.max(1, Math.min(page, numPages));
      jumpToPage(p - 1);
      syncProgress(p, p === numPages);
    },
    [numPages, syncProgress, jumpToPage]
  );

  useEffect(() => {
    switchScrollMode(isContinuous ? ScrollMode.Vertical : ScrollMode.Page);
  }, [isContinuous, switchScrollMode]);

  const resetIdleTimer = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (!isImmersive) { setControlsVisible(true); return; }
    document.addEventListener("pointermove", resetIdleTimer);
    resetIdleTimer();
    return () => {
      document.removeEventListener("pointermove", resetIdleTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isImmersive, resetIdleTimer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f" || e.key === "F") setIsImmersive((v) => !v);
      if (e.key === "c" || e.key === "C") setIsContinuous((v) => !v);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleTextSelection = () => {
    if (isReaderMode) return; // no highlights in reader mode
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;
    const range = sel.getRangeAt(0);
    setSelection({ text, page: currentPage, start_offset: range.startOffset, end_offset: range.endOffset });
    setShowModal(true);
  };

  // Restore blob URL in reader mode
  const handleReloadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const url = localDocs.restoreBlob(id, file);
    setLocalBlobUrl(url);
    if (reloadFileRef.current) reloadFileRef.current.value = "";
  };

  // Effective values based on mode
  const effectivePdfUrl = isReaderMode ? localBlobUrl : pdfUrl;
  const effectiveTitle = isReaderMode ? (localDocData?.title ?? "文件") : (doc?.title ?? "");
  const effectiveNumPages = numPages;

  // Show loading in full mode while doc/url not yet ready
  if (!isReaderMode && !doc) return <div className="page-content">載入中...</div>;

  const progress = effectiveNumPages > 0
    ? Math.round((currentPage / effectiveNumPages) * 100)
    : isReaderMode
    ? Math.round((localDocData?.progress ?? 0) * 100)
    : Math.round((doc?.progress ?? 0) * 100);

  return (
    <div className={`reader-layout${isImmersive ? " reader--immersive" : ""}`}>
      <div className="reader-header">
        <div className="reader-header__left">
          <button className="btn" onClick={() => nav("/")}>← 書庫</button>
          <button
            className={`btn${isContinuous ? " btn--primary" : ""}`}
            onClick={() => setIsContinuous((v) => !v)}
            title="切換連續頁 (C)"
          >
            {isContinuous ? "連續" : "單頁"}
          </button>
          <button
            className={`btn${isImmersive ? " btn--primary" : ""}`}
            onClick={() => setIsImmersive((v) => !v)}
            title="沉浸模式 (F)"
          >
            沉浸
          </button>
          {!isReaderMode && (
            <button
              className={`btn${showInspector ? " btn--primary" : ""}`}
              onClick={() => setShowInspector((v) => !v)}
            >
              畫線
            </button>
          )}
          <ZoomOutButton />
          <CurrentScale />
          <ZoomInButton />
          <ShowSearchPopoverButton />
        </div>

        <div className="reader-header__center">
          <span className="reader-header__title">{effectiveTitle}</span>
          {effectiveNumPages > 0 && (
            <span className="reader-header__page">第 {currentPage} / {effectiveNumPages} 頁</span>
          )}
        </div>

        <div className="reader-header__right">
          <span className="reader-progress-badge">{progress}%</span>
        </div>
      </div>

      <div className="reader-progress-track">
        <div className="reader-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="reader-body">
        <div className="reader-pdf">
          {!isContinuous && (
            <div className="page-controls">
              <button className="btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>‹ 上頁</button>
              <input
                className="input"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goToPage(Number(pageInput))}
                style={{ width: 48, textAlign: "center" }}
              />
              <span>/ {effectiveNumPages || "?"}</span>
              <button className="btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= effectiveNumPages}>下頁 ›</button>
            </div>
          )}

          <div className="reader-viewer-container" onMouseUp={handleTextSelection}>
            <Worker workerUrl={new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).href}>
              {effectivePdfUrl ? (
                <Viewer
                  fileUrl={effectivePdfUrl}
                  characterMap={{ isCompressed: true, url: "/cmaps/" }}
                  plugins={[
                    pageNavigationPluginInstance,
                    scrollModePluginInstance,
                    zoomPluginInstance,
                    searchPluginInstance,
                  ]}
                  initialPage={isReaderMode && localDocData?.page ? localDocData.page - 1 : 0}
                  onPageChange={(e) => {
                    const page = e.currentPage + 1;
                    setCurrentPage(page);
                    setPageInput(String(page));
                    syncProgress(page, page === effectiveNumPages);
                  }}
                  onDocumentLoad={(e) => {
                    setNumPages(e.doc.numPages);
                  }}
                  renderError={() => (
                    <div className="pdf-error">
                      PDF 檔案無法載入，可能已從儲存空間中刪除。請重新上傳。
                    </div>
                  )}
                />
              ) : isReaderMode ? (
                // Reader mode: blob URL not available after page refresh
                <div className="pdf-error" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <p>頁面已重整，PDF 需重新載入</p>
                  <button className="btn btn--primary" onClick={() => reloadFileRef.current?.click()}>
                    選取 PDF 檔案
                  </button>
                  <input ref={reloadFileRef} type="file" accept=".pdf" hidden onChange={handleReloadFile} />
                </div>
              ) : (
                <div className="pdf-error">載入中…</div>
              )}
            </Worker>
          </div>
        </div>

        {/* Highlight inspector: full mode only */}
        {!isReaderMode && id && showInspector && (
          <div className="reader-inspector">
            <div className="reader-inspector__filters">
              <input className="input" value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="搜尋畫線..." />
              <input className="input" value={filterTag} onChange={(e) => setFilterTag(e.target.value)} placeholder="知識標籤篩選" />
            </div>
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

      {/* Highlight modal: full mode only */}
      {!isReaderMode && showModal && selection && id && (
        <HighlightModal
          documentId={id}
          selection={selection}
          onClose={() => setShowModal(false)}
          onCreated={() => setHighlightKey((k) => k + 1)}
        />
      )}

      {isImmersive && (
        <FloatingControls
          visible={controlsVisible}
          currentPage={currentPage}
          numPages={effectiveNumPages}
          isContinuous={isContinuous}
          onExit={() => setIsImmersive(false)}
          onToggleContinuous={() => setIsContinuous((v) => !v)}
          onPageChange={goToPage}
        />
      )}
    </div>
  );
}
