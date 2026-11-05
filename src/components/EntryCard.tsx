import { Link } from "react-router-dom";
import type { Entry } from "../lib/schema";
import { assetUrl, categoryOf, typeOf } from "../lib/data";
import { StatusBadge, TypeBadge, XBadge, tint } from "./Badges";

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
  if (!src) return <span className="thumb thumb-glyph" style={{ width: size, height: size, fontSize: size * 0.48 }}>{categoryOf(entry.category).icon}</span>;
  return <img className="thumb" src={src} width={size} height={size} alt="" loading="lazy" referrerPolicy="no-referrer" />;
}

export default function EntryCard({ entry: e, showCategory, onTag }: { entry: Entry; showCategory?: boolean; onTag?: (t: string) => void }) {
  const cat = categoryOf(e.category);
  return (
    <article className="card" style={tint(typeOf(e.type).color)}>
      {e.image && (
        <Link to={`/e/${e.id}`} className="card-image" tabIndex={-1}>
          <img src={assetUrl(e.image)} alt="" loading="lazy" />
        </Link>
      )}
      <div className="card-head">
        <Thumb entry={e} />
        <div className="card-meta">
          <TypeBadge type={e.type} />
          <StatusBadge status={e.status} />
          <XBadge entry={e} />
          {showCategory && (
            <span className="card-cat">
              {cat.icon} {cat.name}
            </span>
          )}
        </div>
      </div>
      <h3>
        <Link to={`/e/${e.id}`} className="stretched">
          {e.title}
        </Link>
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
