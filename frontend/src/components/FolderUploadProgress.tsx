import { useEffect } from "react";

export type FileStatus = "pending" | "uploading" | "done" | "error" | "skipped";

export interface UploadItem {
  name: string;
  status: FileStatus;
  error?: string;
}

const STATUS_ICON: Record<FileStatus, string> = {
  pending: "○",
  uploading: "⏳",
  done: "✓",
  error: "✗",
  skipped: "–",
};

interface Props {
  items: UploadItem[];
  skippedCount: number;
  onDismiss: () => void;
}

export default function FolderUploadProgress({ items, skippedCount, onDismiss }: Props) {
  const total = items.length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const dupCount = items.filter((i) => i.status === "skipped").length;
  const finishedCount = doneCount + errorCount + dupCount;
  const isComplete = finishedCount === total;
  const progress = total === 0 ? 0 : finishedCount / total;
  const totalSkipped = skippedCount + dupCount;

  // Auto-dismiss 3s after completion
  useEffect(() => {
    if (!isComplete) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [isComplete, onDismiss]);

  const displayItems = items.slice(0, 20);
  const hiddenCount = items.length - displayItems.length;

  return (
    <div className="folder-upload-progress">
      <div className="folder-upload-progress__header">
        {isComplete ? (
          <span className="folder-upload-progress__title">
            上傳完成：{doneCount} 個成功
            {errorCount > 0 && `，${errorCount} 個失敗`}
            {totalSkipped > 0 && `，${totalSkipped} 個略過`}
          </span>
        ) : (
          <span className="folder-upload-progress__title">
            上傳中 {finishedCount} / {total}
          </span>
        )}
        <button className="btn btn--ghost btn--sm" onClick={onDismiss}>✕</button>
      </div>

      <div className="folder-upload-progress__bar-track">
        <div
          className="folder-upload-progress__bar-fill"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <ul className="folder-upload-progress__list">
        {displayItems.map((item, i) => (
          <li key={i} className={`folder-upload-progress__item folder-upload-progress__item--${item.status}`}>
            <span className="folder-upload-progress__icon">{STATUS_ICON[item.status]}</span>
            <span className="folder-upload-progress__name">{item.name}</span>
            {item.status === "skipped" && (
              <span className="folder-upload-progress__skip">已存在</span>
            )}
            {item.status === "error" && item.error && (
              <span className="folder-upload-progress__error">{item.error}</span>
            )}
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="folder-upload-progress__more">還有 {hiddenCount} 個檔案...</li>
        )}
      </ul>
    </div>
  );
}
