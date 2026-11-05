import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BY_ID, CATEGORIES, ENTRIES, IS_DEV, STATUSES, TYPES, categoryOf, githubEditUrl, saveEntry } from "../lib/data";
import { EntrySchema, TWITTER_STATES, type Entry } from "../lib/schema";
import { sanitizeHtml, textToHtml } from "../lib/html";
import RichEditor from "../components/RichEditor";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function ghOf(url: string) {
  const m = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
  return m ? { owner: m[1], repo: m[2].replace(/\.git$/, "") } : undefined;
}

type Form = Omit<Entry, "tags" | "links"> & { tagsText: string; linksText: string };

function toForm(e?: Entry): Form {
  const now = new Date().toISOString();
  const base: Entry = e ?? {
    id: "",
    type: TYPES[0].id,
    title: "",
    summary: "",
    category: CATEGORIES[0].id,
    tags: [],
    source: { file: "manual" },
    status: STATUSES.find((s) => s.visible)!.id,
    createdAt: now,
    updatedAt: now,
  };
  const { tags, links, ...rest } = base;
  // El contenido se edita siempre como HTML; el texto plano importado se convierte al abrirlo.
  const body = rest.body ? (rest.bodyFormat === "html" ? rest.body : textToHtml(rest.body)) : undefined;
  return { ...rest, body, bodyFormat: body ? "html" : undefined, tagsText: tags.join(", "), linksText: (links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n") };
}

function fromForm(f: Form): Entry {
  const { tagsText, linksText, ...rest } = f;
  const links = linksText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [a, b] = l.split("|").map((s) => s.trim());
      return b ? { label: a, url: b } : { label: a.replace(/^https?:\/\//, ""), url: a };
    });
  const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== "" && v !== undefined)) as unknown as Entry;
  return {
    ...clean,
    summary: rest.summary ?? "",
    body: rest.body ? sanitizeHtml(rest.body) : undefined,
    bodyFormat: rest.body ? "html" : undefined,
    github: rest.url ? ghOf(rest.url) : undefined,
    tags: [...new Set(tagsText.split(",").map((t) => slugify(t)).filter(Boolean))],
    links: links.length ? links : undefined,
  };
}

export default function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const existing = id ? BY_ID.get(id) : undefined;
  const [form, setForm] = useState<Form>(() => toForm(existing));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allTags = useMemo(() => [...new Set(ENTRIES.flatMap((e) => e.tags))].sort(), []);
  const subs = categoryOf(form.category).subcategories;

  if (!IS_DEV) {
    return (
      <div className="panel">
        <h1>Edición</h1>
        <p>El panel de edición sólo está disponible al ejecutar el proyecto en local (<code>npm run dev</code>).</p>
        {existing && (
          <a className="btn btn-primary" href={githubEditUrl(existing)} target="_blank" rel="noopener noreferrer">
            Editar en GitHub ↗
          </a>
        )}
      </div>
    );
  }
  if (id && !existing) return <p className="empty">Entrada no encontrada.</p>;

  const up = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(null);
    const entry = fromForm({ ...form, id: form.id || slugify(`${form.type}-${form.title}`) });
    const check = EntrySchema.safeParse(entry);
    if (!check.success) {
      setError(check.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · "));
      return;
    }
    setSaving(true);
    try {
      await saveEntry(entry, existing?.id);
      // Vite recarga la página al cambiar /data; navegamos a la ficha guardada.
      nav(`/e/${entry.id}`);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || !confirm(`¿Eliminar «${existing.title}» de data/${existing.category}.json?`)) return;
    const r = await fetch(`/api/entries/${encodeURIComponent(existing.id)}`, { method: "DELETE" });
    if (r.ok) nav(`/c/${existing.category}`);
    else setError((await r.json()).error);
  };

  return (
    <div className="panel editor">
      <nav className="crumbs">
        <Link to="/">Inicio</Link> / {existing ? <Link to={`/e/${existing.id}`}>{existing.title}</Link> : "Nueva entrada"}
      </nav>
      <h1>{existing ? "Editar entrada" : "Nueva entrada"}</h1>

      <div className="form-grid">
        <label className="span2">
          Título
          <input value={form.title} onChange={(e) => up("title", e.target.value)} required />
        </label>
        <label>
          Tipo
          <select value={form.type} onChange={(e) => up("type", e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={form.status} onChange={(e) => up("status", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.visible ? "" : " (oculta)"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoría
          <select
            value={form.category}
            onChange={(e) => {
              const cat = e.target.value;
              setForm((f) => ({ ...f, category: cat, subcategory: categoryOf(cat).subcategories.some((s) => s.id === f.subcategory) ? f.subcategory : undefined }));
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subcategoría <small><Link to="/admin/taxonomy">gestionar</Link></small>
          <select value={form.subcategory ?? ""} onChange={(e) => up("subcategory", e.target.value || undefined)}>
            <option value="">— Sin subcategoría —</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            {form.subcategory && !subs.some((s) => s.id === form.subcategory) && <option value={form.subcategory}>{form.subcategory} (no registrada)</option>}
          </select>
        </label>
        <label>
          Twitter / X
          <select value={form.twitter ?? "unpublished"} onChange={(e) => up("twitter", e.target.value as Entry["twitter"])}>
            {Object.entries(TWITTER_STATES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hilo de X
          <input readOnly value={form.thread?.length ? `${form.thread.length} posts guardados (se edita desde la ficha)` : "Sin hilo · genéralo desde la ficha"} />
        </label>
        <label className="span2">
          Enlace principal
          <input type="url" value={form.url ?? ""} onChange={(e) => up("url", e.target.value || undefined)} placeholder="https://github.com/usuario/repo" />
        </label>
        <label className="span2">
          Resumen <small>(1–2 frases, se muestra en la tarjeta)</small>
          <textarea rows={3} value={form.summary} onChange={(e) => up("summary", e.target.value)} maxLength={600} />
        </label>
        <div className="span2 field">
          <span className="field-label">
            Contenido / prompt completo <small>(negrita, subrayado, alineación, listas, enlaces…)</small>
          </span>
          <RichEditor value={form.body ?? ""} onChange={(html) => up("body", html || undefined)} placeholder="Desarrolla aquí el contenido de la ficha…" />
        </div>
        <label className="span2">
          Tags <small>(separados por comas)</small>
          <input value={form.tagsText} onChange={(e) => up("tagsText", e.target.value)} />
          <span className="tag-suggest">
            {allTags
              .filter((t) => !form.tagsText.split(",").map((x) => x.trim()).includes(t))
              .slice(0, 24)
              .map((t) => (
                <button type="button" key={t} className="tag" onClick={() => up("tagsText", [form.tagsText.trim().replace(/,$/, ""), t].filter(Boolean).join(", "))}>
                  +{t}
                </button>
              ))}
          </span>
        </label>
        <label className="span2">
          Enlaces adicionales <small>(uno por línea: «etiqueta | url»)</small>
          <textarea rows={3} value={form.linksText} onChange={(e) => up("linksText", e.target.value)} />
        </label>
        <label>
          Imagen <small>(ruta en public/, ej. images/x.jpeg)</small>
          <input value={form.image ?? ""} onChange={(e) => up("image", e.target.value || undefined)} />
        </label>
        <label>
          Id (slug)
          <input value={form.id} onChange={(e) => up("id", slugify(e.target.value))} placeholder="se genera del título" />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button className="btn" onClick={() => nav(-1)}>
          Cancelar
        </button>
        <span className="spacer" />
        {existing && (
          <button className="btn btn-danger" onClick={remove}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
