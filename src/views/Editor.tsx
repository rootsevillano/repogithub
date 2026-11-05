import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BY_ID, ENTRIES, IS_DEV, githubEditUrl } from "../lib/data";
import { CATEGORIES, ENTRY_TYPES, EntrySchema, TYPE_LABELS, type Entry } from "../lib/schema";
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
    type: "repo",
    title: "",
    summary: "",
    category: "repos",
    tags: [],
    source: { file: "manual" },
    status: "active",
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
  const subs = useMemo(() => [...new Set(ENTRIES.filter((e) => e.category === form.category).map((e) => e.subcategory).filter(Boolean))] as string[], [form.category]);

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
      const r = await fetch("/api/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry, originalId: existing?.id }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error + (res.issues ? `: ${JSON.stringify(res.issues)}` : ""));
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
          <select value={form.type} onChange={(e) => up("type", e.target.value as Entry["type"])}>
            {ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={form.status} onChange={(e) => up("status", e.target.value as Entry["status"])}>
            <option value="active">Publicada</option>
            <option value="review">Pendiente de revisión</option>
            <option value="archived">Archivada (oculta)</option>
          </select>
        </label>
        <label>
          Categoría
          <select value={form.category} onChange={(e) => up("category", e.target.value as Entry["category"])}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subcategoría
          <input list="subs" value={form.subcategory ?? ""} onChange={(e) => up("subcategory", slugify(e.target.value) || undefined)} />
          <datalist id="subs">
            {subs.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
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
