import { useState } from "react";
import type { Document } from "../types";

function titleToHue(title: string): number {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

function HeroCover({ doc, thumbUrl }: { doc: Document; thumbUrl: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hue = titleToHue(doc.title);
  const showImg = thumbUrl && !imgFailed;

  if (showImg) {
    return (
      <div className="hero-card__cover" style={{ padding: 0, overflow: "hidden" }}>
        <img
          src={thumbUrl}
          alt={doc.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="hero-card__cover" style={{ background: `hsl(${hue}, 55%, 68%)` }}>
      <span className="hero-card__initial">
        {doc.title.trim()[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}

export default function HeroShelf({
  docs,
  thumbUrls,
  onNavigate,
}: {
  docs: Document[];
  thumbUrls?: Map<string, string>;
  onNavigate: (id: string) => void;
}) {
  if (docs.length === 0) return null;

  return (
    <div className="hero-shelf">
      {docs.map((doc) => {
        const progress = Math.round(doc.progress * 100);
        return (
          <button
            key={doc.id}
            type="button"
            className="hero-card"
            onClick={() => onNavigate(doc.id)}
          >
            <HeroCover doc={doc} thumbUrl={thumbUrls?.get(doc.id) ?? null} />
            <div className="hero-card__meta">
              <span className="hero-card__title">{doc.title}</span>
              <div className="hero-card__progress-track">
                <div
                  className="hero-card__progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="hero-card__pct">{progress}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
