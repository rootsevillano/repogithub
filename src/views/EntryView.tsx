import { Fragment, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BY_ID, ENTRIES, IS_DEV, assetUrl, categoryOf, githubEditUrl } from "../lib/data";
import { TYPE_LABELS } from "../lib/schema";
import EntryCard, { Thumb, hostOf } from "../components/EntryCard";

const URL_SPLIT = /(https?:\/\/[^\s<>"')\]]+)/g;

/** Texto plano con saltos de línea y enlaces clicables. */
export function RichText({ text }: { text: string }) {
  return (
    <div className="rich">
      {text.split(URL_SPLIT).map((part, i) =>
        i % 2 ? (
          <a key={i} href={part.replace(/[.,;:!?…]+$/, "")} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </div>
  );
}

export default function EntryView() {
  const { id } = useParams();
  const e = id ? BY_ID.get(id) : undefined;
  const [copied, setCopied] = useState(false);

  const related = useMemo(() => {
    if (!e) return [];
    return ENTRIES.filter((o) => o.id !== e.id && o.status !== "archived")
      .map((o) => ({ o, score: (o.subcategory === e.subcategory ? 2 : 0) + o.tags.filter((t) => e.tags.includes(t)).length + (o.category === e.category ? 1 : 0) }))
      .filter((x) => x.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.o);
  }, [e]);

  if (!e) return <p className="empty">Entrada no encontrada. <Link to="/">Volver</Link></p>;
  const cat = categoryOf(e.category);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(e.body ?? e.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* portapapeles no disponible */
    }
  };

  return (
    <article className="detail">
      <nav className="crumbs">
        <Link to="/">Inicio</Link> / <Link to={`/c/${cat.id}`}>{cat.name}</Link>
        {e.subcategory && (
          <>
            {" "}/ <Link to={`/c/${cat.id}?sub=${e.subcategory}`}>{e.subcategory.replace(/-/g, " ")}</Link>
          </>
        )}
      </nav>

      <header className="detail-head">
        <Thumb entry={e} size={56} />
        <div>
          <div className="card-meta">
            <span className={`badge badge-${e.type}`}>{TYPE_LABELS[e.type]}</span>
            {e.status === "review" && <span className="badge badge-review">pendiente de revisión</span>}
          </div>
          <h1>{e.title}</h1>
          {e.github && (
            <p className="repo-path">
              {e.github.owner}/<b>{e.github.repo}</b>
            </p>
          )}
        </div>
      </header>

      {e.summary && e.summary !== e.title && <p className="lead">{e.summary}</p>}

      <div className="actions">
        {e.url && (
          <a className="btn btn-primary" href={e.url} target="_blank" rel="noopener noreferrer">
            Abrir {e.github ? "en GitHub" : hostOf(e.url)} ↗
          </a>
        )}
        {e.type === "prompt" && (
          <button className="btn" onClick={copy}>
            {copied ? "¡Copiado!" : "Copiar prompt"}
          </button>
        )}
        {IS_DEV ? (
          <Link className="btn" to={`/admin/edit/${e.id}`}>
            ✎ Editar
          </Link>
        ) : (
          <a className="btn" href={githubEditUrl(e)} target="_blank" rel="noopener noreferrer" title={`Busca "${e.id}" en el fichero`}>
            ✎ Editar en GitHub
          </a>
        )}
      </div>

      {e.github && !e.image && (
        <img className="og" src={`https://opengraph.githubassets.com/1/${e.github.owner}/${e.github.repo}`} alt="" loading="lazy" onError={(ev) => (ev.currentTarget.style.display = "none")} />
      )}
      {e.image && (
        <a href={assetUrl(e.image)} target="_blank" rel="noopener noreferrer">
          <img className="og" src={assetUrl(e.image)} alt={e.title} />
        </a>
      )}

      {e.body && (
        <section>
          <h2>{e.type === "prompt" ? "Prompt" : "Contenido"}</h2>
          <RichText text={e.body} />
        </section>
      )}

      {!!e.links?.length && (
        <section>
          <h2>Enlaces</h2>
          <ul className="links">
            {e.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>{" "}
                <span className="muted">{l.url}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="detail-foot">
        <div className="tag-list">
          {e.tags.map((t) => (
            <Link key={t} className="tag" to={`/?tag=${t}`}>
              #{t}
            </Link>
          ))}
        </div>
        <p className="muted small">
          Fuente: {e.source.file}
          {e.source.line ? ` · línea ${e.source.line}` : ""} · actualizado {new Date(e.updatedAt).toLocaleDateString("es-ES")} · id <code>{e.id}</code>
        </p>
      </footer>

      {!!related.length && (
        <section>
          <h2>Relacionado</h2>
          <div className="grid">
            {related.map((o) => (
              <EntryCard key={o.id} entry={o} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
