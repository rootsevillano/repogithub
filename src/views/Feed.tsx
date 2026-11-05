import { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ENTRIES, BY_ID, CATEGORIES, IS_DEV, STATUSES, categoryOf, countBy, isVisible, subcategoryName, typeOf } from "../lib/data";
import { buildIndex } from "../lib/search";
import type { Entry } from "../lib/schema";
import EntryCard from "../components/EntryCard";

const INDEX = buildIndex(ENTRIES);
const PAGE = 48;

const SORTS: Record<string, { label: string; fn: (a: Entry, b: Entry) => number }> = {
  recent: { label: "Recientes", fn: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || (b.source.line ?? 0) - (a.source.line ?? 0) },
  az: { label: "A–Z", fn: (a, b) => a.title.localeCompare(b.title, "es") },
  source: { label: "Orden original", fn: (a, b) => a.source.file.localeCompare(b.source.file) || (a.source.line ?? 0) - (b.source.line ?? 0) },
};

export default function Feed() {
  const { cat } = useParams<{ cat: string }>();
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const sub = params.get("sub");
  const tag = params.get("tag");
  const type = params.get("type");
  const sort = params.get("sort") ?? (q ? "relevance" : "recent");
  const status = params.get("status");
  const x = params.get("x");
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [cat, q, sub, tag, type, sort, status, x]);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v === null || next.get(k) === v) next.delete(k);
    else next.set(k, v);
    if (k === "cat") next.delete("sub");
    setParams(next, { replace: true });
  };

  // Base: categoría + búsqueda
  const base = useMemo(() => {
    let list: Entry[];
    if (q) {
      list = INDEX.search(q)
        .map((r) => BY_ID.get(r.id as string))
        .filter((e): e is Entry => !!e);
      if (!list.length) list = INDEX.search(q, { combineWith: "OR" }).map((r) => BY_ID.get(r.id as string)!).filter(Boolean);
    } else list = ENTRIES;
    return list.filter(
      (e) =>
        (status ? e.status === status : isVisible(e)) &&
        (!cat || e.category === cat) &&
        (!x || (x === "published") === (e.twitter === "published")),
    );
  }, [q, cat, status, x]);

  const filtered = useMemo(() => {
    const list = base.filter((e) => (!sub || e.subcategory === sub) && (!tag || e.tags.includes(tag)) && (!type || e.type === type));
    if (sort !== "relevance" && SORTS[sort]) return [...list].sort(SORTS[sort].fn);
    return list;
  }, [base, sub, tag, type, sort]);

  const subs = useMemo(() => (cat ? countBy(base, (e) => e.subcategory) : []), [base, cat]);
  const types = useMemo(() => countBy(base, (e) => e.type), [base]);
  const tags = useMemo(() => countBy(base.filter((e) => !sub || e.subcategory === sub), (e) => e.tags).slice(0, 18), [base, sub]);

  const meta = cat ? categoryOf(cat) : null;
  const visible = useMemo(() => ENTRIES.filter(isVisible), []);
  const stats = useMemo(
    () => [
      { n: visible.length, label: "fichas" },
      { n: visible.filter((e) => e.github).length, label: "repositorios" },
      { n: new Set(visible.flatMap((e) => e.tags)).size, label: "etiquetas" },
      { n: CATEGORIES.length, label: "categorías" },
    ],
    [visible],
  );

  return (
    <div className="feed">
      <section className="hero">
        <p className="eyebrow">{meta ? "Categoría" : "TechHub · Radar técnico"}</p>
        <h1>
          {meta ? (
            <>
              <span aria-hidden>{meta.icon}</span> {meta.name}
            </>
          ) : (
            "Lo último en tu radar técnico"
          )}
        </h1>
        <p>{meta ? meta.description : "Repositorios, herramientas, prompts y apuntes recopilados y organizados en un solo sitio."}</p>
        {!meta && !q && (
          <dl className="stats">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.n.toLocaleString("es-ES")}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="filters" aria-label="Filtros">
        {subs.length > 1 && (
          <div className="chip-row">
            {subs.map(([s, n]) => (
              <button key={s} className={`chip ${sub === s ? "on" : ""}`} onClick={() => set("sub", s)}>
                {subcategoryName(cat!, s)} <em>{n}</em>
              </button>
            ))}
          </div>
        )}
        <div className="chip-row">
          {types.map(([t, n]) => (
            <button key={t} className={`chip chip-type ${type === t ? "on" : ""}`} onClick={() => set("type", t)}>
              <i className="dot" style={{ background: typeOf(t).color }} />
              {typeOf(t).label} <em>{n}</em>
            </button>
          ))}
          <span className="spacer" />
          <select value={status ?? ""} onChange={(e) => set("status", e.target.value || null)} aria-label="Estado">
            <option value="">Estado: visibles</option>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                Estado: {s.label}
              </option>
            ))}
          </select>
          {IS_DEV && (
            <select value={x ?? ""} onChange={(e) => set("x", e.target.value || null)} aria-label="Publicación en X">
              <option value="">𝕏: todas</option>
              <option value="published">𝕏: publicado</option>
              <option value="unpublished">𝕏: no publicado</option>
            </select>
          )}
          <select value={sort} onChange={(e) => set("sort", e.target.value)} aria-label="Ordenar">
            {q && <option value="relevance">Relevancia</option>}
            {Object.entries(SORTS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="chip-row tags">
          {tags.map(([t, n]) => (
            <button key={t} className={`tag ${tag === t ? "on" : ""}`} onClick={() => set("tag", t)}>
              #{t} <em>{n}</em>
            </button>
          ))}
        </div>
      </section>

      <p className="result-count">
        {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
        {q && (
          <>
            {" "}para «{q}»
          </>
        )}
        {(sub || tag || type || status || x) && (
          <button className="link-btn" onClick={() => setParams(q ? { q } : {}, { replace: true })}>
            Limpiar filtros
          </button>
        )}
      </p>

      {filtered.length ? (
        <div className="grid">
          {filtered.slice(0, limit).map((e) => (
            <EntryCard key={e.id} entry={e} showCategory={!cat} onTag={(t) => set("tag", t)} />
          ))}
        </div>
      ) : (
        <p className="empty">No hay resultados con estos filtros.</p>
      )}
      {filtered.length > limit && (
        <button className="btn more" onClick={() => setLimit(limit + PAGE)}>
          Ver más ({filtered.length - limit} restantes)
        </button>
      )}
    </div>
  );
}
