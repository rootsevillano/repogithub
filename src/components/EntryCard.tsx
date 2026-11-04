import { Link } from "react-router-dom";
import { TYPE_LABELS, type Entry } from "../lib/schema";
import { assetUrl, categoryOf } from "../lib/data";

export function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function Thumb({ entry, size = 40 }: { entry: Entry; size?: number }) {
  const src = entry.github
    ? `https://github.com/${entry.github.owner}.png?size=${size * 2}`
    : entry.url
      ? `https://www.google.com/s2/favicons?domain=${hostOf(entry.url)}&sz=64`
      : null;
  if (!src) return <span className="thumb thumb-glyph" style={{ width: size, height: size }}>{categoryOf(entry.category).icon}</span>;
  return <img className="thumb" src={src} width={size} height={size} alt="" loading="lazy" referrerPolicy="no-referrer" />;
}

export default function EntryCard({ entry: e, showCategory, onTag }: { entry: Entry; showCategory?: boolean; onTag?: (t: string) => void }) {
  const cat = categoryOf(e.category);
  return (
    <article className={`card type-${e.type}`}>
      {e.image && (
        <Link to={`/e/${e.id}`} className="card-image">
          <img src={assetUrl(e.image)} alt="" loading="lazy" />
        </Link>
      )}
      <div className="card-head">
        <Thumb entry={e} />
        <div className="card-meta">
          <span className={`badge badge-${e.type}`}>{TYPE_LABELS[e.type]}</span>
          {showCategory && (
            <span className="muted">
              {cat.icon} {cat.name}
            </span>
          )}
          {e.status === "review" && <span className="badge badge-review" title="Entrada importada sin descripción suficiente">revisar</span>}
        </div>
      </div>
      <h3>
        <Link to={`/e/${e.id}`}>{e.title}</Link>
      </h3>
      {e.github && (
        <p className="repo-path">
          {e.github.owner}/<b>{e.github.repo}</b>
        </p>
      )}
      {e.summary && e.summary !== e.title && <p className="summary">{e.summary}</p>}
      <div className="card-foot">
        <div className="tag-list">
          {e.tags.slice(0, 4).map((t) => (
            <button key={t} className="tag" onClick={() => onTag?.(t)}>
              #{t}
            </button>
          ))}
        </div>
        {e.url && (
          <a className="ext" href={e.url} target="_blank" rel="noopener noreferrer" title={e.url}>
            {e.github ? "GitHub" : hostOf(e.url)} ↗
          </a>
        )}
      </div>
    </article>
  );
}
