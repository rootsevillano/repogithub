import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ENTRIES, IS_DEV, TAXONOMY } from "../lib/data";
import { SLUG, TaxonomySchema, type Remap, type Taxonomy } from "../lib/taxonomy";

type Tab = "categories" | "types" | "statuses";
type Pending = { kind: "categories" | "types" | "statuses"; id: string } | { kind: "subcategories"; cat: string; id: string };

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "categories", label: "Categorías y subcategorías", hint: "Secciones del menú lateral. Cada categoría se guarda en data/<id>.json." },
  { id: "types", label: "Tipos", hint: "Naturaleza de la ficha (repositorio, herramienta, prompt…). El color se usa en distintivos y tarjetas." },
  { id: "statuses", label: "Estados", hint: "Ciclo de vida de la ficha. «Visible» la muestra en el feed; «Distintivo» la marca en tarjetas." },
];

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function moveItem<T>(list: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const n = [...list];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
}

function uniqueId(base: string, taken: string[]) {
  let id = base || "nuevo";
  let n = 2;
  while (taken.includes(id)) id = `${base}-${n++}`;
  return id;
}

function IdCell({ id, locked, onChange }: { id: string; locked: boolean; onChange: (v: string) => void }) {
  return locked ? (
    <code className="tx-id" title="El id no se puede cambiar porque las fichas lo usan">
      {id}
    </code>
  ) : (
    <input className="tx-id-input" value={id} placeholder="id (auto)" onChange={(e) => onChange(slugify(e.target.value))} aria-label="Id" />
  );
}

function RowTools({ onUp, onDown, onDelete, count }: { onUp: () => void; onDown: () => void; onDelete: () => void; count: number }) {
  return (
    <div className="tx-tools">
      <span className="tx-count" title="Fichas que lo usan">
        {count} fichas
      </span>
      <button className="rt-btn" title="Subir" onClick={onUp}>
        ↑
      </button>
      <button className="rt-btn" title="Bajar" onClick={onDown}>
        ↓
      </button>
      <button className="rt-btn tx-del" title="Eliminar" onClick={onDelete}>
        ✕
      </button>
    </div>
  );
}

export default function TaxonomyAdmin() {
  const [tax, setTax] = useState<Taxonomy>(() => clone(TAXONOMY));
  const [remap, setRemap] = useState<Remap>({});
  const [tab, setTab] = useState<Tab>("categories");
  const [pending, setPending] = useState<Pending | null>(null);
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [openCat, setOpenCat] = useState<number | null>(0);

  // Ids que ya existían: no se pueden renombrar (las fichas los referencian).
  const original = useMemo(
    () => ({
      categories: new Set(TAXONOMY.categories.map((c) => c.id)),
      types: new Set(TAXONOMY.types.map((t) => t.id)),
      statuses: new Set(TAXONOMY.statuses.map((s) => s.id)),
      subs: new Set(TAXONOMY.categories.flatMap((c) => c.subcategories.map((s) => `${c.id}/${s.id}`))),
    }),
    [],
  );

  // Uso actual de cada elemento (teniendo en cuenta las reasignaciones pendientes).
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    const inc = (k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    for (const e of ENTRIES) {
      const cat = remap.categories?.[e.category] ?? e.category;
      inc(`types:${remap.types?.[e.type] ?? e.type}`);
      inc(`statuses:${remap.statuses?.[e.status] ?? e.status}`);
      inc(`categories:${cat}`);
      if (e.subcategory) {
        const k = `${e.category}/${e.subcategory}`;
        const sub = remap.subcategories && k in remap.subcategories ? remap.subcategories[k] : e.subcategory;
        if (sub && cat === e.category) inc(`subcategories:${cat}/${sub}`);
      }
    }
    return m;
  }, [remap]);
  const used = (k: string) => usage.get(k) ?? 0;

  const dirty = JSON.stringify(tax) !== JSON.stringify(TAXONOMY) || Object.keys(remap).length > 0;

  if (!IS_DEV) {
    return (
      <div className="panel">
        <h1>Taxonomía</h1>
        <p>La gestión de tipos, estados y categorías sólo está disponible al ejecutar el proyecto en local (<code>npm run dev</code>).</p>
      </div>
    );
  }

  /* ---------- edición ---------- */
  const patch = (fn: (t: Taxonomy) => void) =>
    setTax((t) => {
      const n = clone(t);
      fn(n);
      return n;
    });

  const addRemap = (kind: keyof Remap, from: string, to: string) =>
    setRemap((r) => {
      const n = clone(r);
      const m = (n[kind] ??= {});
      // Si otras reasignaciones apuntaban al elemento borrado, se redirigen al nuevo destino.
      for (const k of Object.keys(m)) if (m[k] === from) m[k] = to;
      m[from] = to;
      return n;
    });

  const askDelete = (p: Pending) => {
    const key = p.kind === "subcategories" ? `subcategories:${p.cat}/${p.id}` : `${p.kind}:${p.id}`;
    if (!used(key)) return doDelete(p, "");
    setPending(p);
    setTarget("");
  };

  const doDelete = (p: Pending, to: string) => {
    if (p.kind === "subcategories") {
      patch((t) => {
        const c = t.categories.find((x) => x.id === p.cat)!;
        c.subcategories = c.subcategories.filter((s) => s.id !== p.id);
      });
      if (used(`subcategories:${p.cat}/${p.id}`)) addRemap("subcategories", `${p.cat}/${p.id}`, to);
    } else {
      patch((t) => {
        (t[p.kind] as { id: string }[]) = (t[p.kind] as { id: string }[]).filter((x) => x.id !== p.id);
      });
      if (used(`${p.kind}:${p.id}`)) addRemap(p.kind, p.id, to);
    }
    setPending(null);
  };

  const save = async () => {
    setMsg(null);
    // Ids vacíos → derivados del nombre.
    const t = clone(tax);
    const fill = (list: { id: string; name?: string; label?: string }[]) => {
      for (const x of list) if (!x.id) x.id = uniqueId(slugify(x.name ?? x.label ?? ""), list.map((y) => y.id));
    };
    fill(t.categories);
    fill(t.types);
    fill(t.statuses);
    t.categories.forEach((c) => fill(c.subcategories));
    const check = TaxonomySchema.safeParse(t);
    if (!check.success) {
      setMsg({ ok: false, text: check.error.issues.map((i) => `${i.path.join(" › ")}: ${i.message}`).join(" · ") });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/taxonomy", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taxonomy: t, remap }) });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error);
      setMsg({ ok: true, text: `Taxonomía guardada${res.updated ? ` · ${res.updated} fichas reasignadas` : ""}. Recargando…` });
      setRemap({});
    } catch (err) {
      setMsg({ ok: false, text: String(err).replace(/^Error: /, "") });
    } finally {
      setSaving(false);
    }
  };

  const reassignOptions = (): { id: string; label: string }[] => {
    if (!pending) return [];
    if (pending.kind === "subcategories") {
      const c = tax.categories.find((x) => x.id === pending.cat)!;
      return [{ id: "", label: "— Sin subcategoría —" }, ...c.subcategories.filter((s) => s.id !== pending.id).map((s) => ({ id: s.id, label: s.name }))];
    }
    if (pending.kind === "categories") return tax.categories.filter((c) => c.id !== pending.id).map((c) => ({ id: c.id, label: `${c.icon} ${c.name}` }));
    if (pending.kind === "types") return tax.types.filter((x) => x.id !== pending.id).map((x) => ({ id: x.id, label: x.label }));
    return tax.statuses.filter((x) => x.id !== pending.id).map((x) => ({ id: x.id, label: x.label }));
  };
  const pendingCount = pending ? used(pending.kind === "subcategories" ? `subcategories:${pending.cat}/${pending.id}` : `${pending.kind}:${pending.id}`) : 0;
  const canConfirm = pending && (pending.kind === "subcategories" || target);

  return (
    <div className="panel tx">
      <nav className="crumbs">
        <Link to="/">Inicio</Link> / Administración
      </nav>
      <header className="page-head">
        <div>
          <p className="eyebrow">Administración local</p>
          <h1>Taxonomía</h1>
          <p className="muted">Añade, renombra, reordena o elimina tipos, estados, categorías y subcategorías. Los cambios se guardan en <code>config/taxonomy.json</code>.</p>
        </div>
        <div className="actions">
          <button className="btn" disabled={!dirty || saving} onClick={() => (setTax(clone(TAXONOMY)), setRemap({}), setMsg(null))}>
            Descartar
          </button>
          <button className="btn btn-primary" disabled={!dirty || saving} onClick={save}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </header>

      {msg && <p className={msg.ok ? "notice" : "error"}>{msg.text}</p>}
      {Object.keys(remap).length > 0 && (
        <p className="notice warn">
          Al guardar se reasignarán las fichas afectadas por los elementos eliminados.
        </p>
      )}

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label} <em>{t.id === "categories" ? tax.categories.length : tax[t.id].length}</em>
          </button>
        ))}
      </div>
      <p className="muted small tx-hint">{TABS.find((t) => t.id === tab)!.hint}</p>

      {pending && (
        <div className="tx-dialog" role="dialog" aria-label="Reasignar fichas">
          <p>
            <b>«{pending.id}»</b> está en uso por <b>{pendingCount}</b> {pendingCount === 1 ? "ficha" : "fichas"}. ¿A qué quieres reasignarlas?
          </p>
          <div className="actions">
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {pending.kind !== "subcategories" && <option value="">Elige destino…</option>}
              {reassignOptions().map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button className="btn btn-danger" disabled={!canConfirm} onClick={() => doDelete(pending, target)}>
              Eliminar y reasignar
            </button>
            <button className="btn" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {tab === "categories" && (
        <div className="tx-list">
          {tax.categories.map((c, i) => {
            const locked = original.categories.has(c.id);
            const open = openCat === i;
            return (
              <div key={i} className={`tx-card ${open ? "open" : ""}`}>
                <div className="tx-row">
                  <input className="tx-icon" value={c.icon} onChange={(e) => patch((t) => (t.categories[i].icon = e.target.value))} aria-label="Icono" />
                  <input className="tx-name" value={c.name} onChange={(e) => patch((t) => (t.categories[i].name = e.target.value))} aria-label="Nombre" placeholder="Nombre de la categoría" />
                  <IdCell id={c.id} locked={locked} onChange={(v) => patch((t) => (t.categories[i].id = v))} />
                  <button className="btn btn-sm" onClick={() => setOpenCat(open ? null : i)}>
                    {c.subcategories.length} subcategorías {open ? "▴" : "▾"}
                  </button>
                  <RowTools
                    count={used(`categories:${c.id}`)}
                    onUp={() => patch((t) => (t.categories = moveItem(t.categories, i, -1)))}
                    onDown={() => patch((t) => (t.categories = moveItem(t.categories, i, 1)))}
                    onDelete={() => (tax.categories.length > 1 ? askDelete({ kind: "categories", id: c.id }) : setMsg({ ok: false, text: "Debe quedar al menos una categoría." }))}
                  />
                </div>
                {open && (
                  <div className="tx-detail">
                    <label>
                      Descripción
                      <textarea rows={2} value={c.description} onChange={(e) => patch((t) => (t.categories[i].description = e.target.value))} />
                    </label>
                    <label>
                      Hashtags para hilos de X <small>(separados por espacios, sin #)</small>
                      <input
                        value={c.hashtags.join(" ")}
                        onChange={(e) =>
                          patch((t) => (t.categories[i].hashtags = e.target.value.split(/[\s,#]+/).filter(Boolean)))
                        }
                      />
                    </label>
                    <div className="tx-subs">
                      <span className="field-label">Subcategorías</span>
                      {c.subcategories.map((s, j) => (
                        <div key={j} className="tx-row tx-sub">
                          <input className="tx-name" value={s.name} onChange={(e) => patch((t) => (t.categories[i].subcategories[j].name = e.target.value))} aria-label="Nombre de la subcategoría" placeholder="Nombre" />
                          <IdCell
                            id={s.id}
                            locked={original.subs.has(`${c.id}/${s.id}`)}
                            onChange={(v) => patch((t) => (t.categories[i].subcategories[j].id = v))}
                          />
                          <RowTools
                            count={used(`subcategories:${c.id}/${s.id}`)}
                            onUp={() => patch((t) => (t.categories[i].subcategories = moveItem(t.categories[i].subcategories, j, -1)))}
                            onDown={() => patch((t) => (t.categories[i].subcategories = moveItem(t.categories[i].subcategories, j, 1)))}
                            onDelete={() => askDelete({ kind: "subcategories", cat: c.id, id: s.id })}
                          />
                        </div>
                      ))}
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => patch((t) => t.categories[i].subcategories.push({ id: "", name: "" }))}
                      >
                        + Añadir subcategoría
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button
            className="btn btn-ghost"
            onClick={() => {
              patch((t) => t.categories.push({ id: "", name: "", icon: "📁", description: "", hashtags: [], subcategories: [] }));
              setOpenCat(tax.categories.length);
            }}
          >
            + Añadir categoría
          </button>
        </div>
      )}

      {tab === "types" && (
        <div className="tx-list">
          {tax.types.map((x, i) => (
            <div key={i} className="tx-card">
              <div className="tx-row">
                <input className="tx-icon" value={x.icon} onChange={(e) => patch((t) => (t.types[i].icon = e.target.value))} aria-label="Icono" />
                <input className="tx-name" value={x.label} onChange={(e) => patch((t) => (t.types[i].label = e.target.value))} aria-label="Nombre" placeholder="Nombre del tipo" />
                <IdCell id={x.id} locked={original.types.has(x.id)} onChange={(v) => patch((t) => (t.types[i].id = v))} />
                <input type="color" className="tx-color" value={x.color} onChange={(e) => patch((t) => (t.types[i].color = e.target.value))} aria-label="Color" />
                <span className="badge" style={{ "--c": x.color } as CSSProperties}>
                  {x.label || "vista previa"}
                </span>
                <RowTools
                  count={used(`types:${x.id}`)}
                  onUp={() => patch((t) => (t.types = moveItem(t.types, i, -1)))}
                  onDown={() => patch((t) => (t.types = moveItem(t.types, i, 1)))}
                  onDelete={() => (tax.types.length > 1 ? askDelete({ kind: "types", id: x.id }) : setMsg({ ok: false, text: "Debe quedar al menos un tipo." }))}
                />
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" onClick={() => patch((t) => t.types.push({ id: "", label: "", icon: "•", color: "#475569" }))}>
            + Añadir tipo
          </button>
        </div>
      )}

      {tab === "statuses" && (
        <div className="tx-list">
          {tax.statuses.map((x, i) => (
            <div key={i} className="tx-card">
              <div className="tx-row">
                <input className="tx-name" value={x.label} onChange={(e) => patch((t) => (t.statuses[i].label = e.target.value))} aria-label="Nombre" placeholder="Nombre del estado" />
                <IdCell id={x.id} locked={original.statuses.has(x.id)} onChange={(v) => patch((t) => (t.statuses[i].id = v))} />
                <input type="color" className="tx-color" value={x.color} onChange={(e) => patch((t) => (t.statuses[i].color = e.target.value))} aria-label="Color" />
                <label className="tx-check">
                  <input type="checkbox" checked={x.visible} onChange={(e) => patch((t) => (t.statuses[i].visible = e.target.checked))} /> Visible
                </label>
                <label className="tx-check">
                  <input type="checkbox" checked={x.flag} onChange={(e) => patch((t) => (t.statuses[i].flag = e.target.checked))} /> Distintivo
                </label>
                <RowTools
                  count={used(`statuses:${x.id}`)}
                  onUp={() => patch((t) => (t.statuses = moveItem(t.statuses, i, -1)))}
                  onDown={() => patch((t) => (t.statuses = moveItem(t.statuses, i, 1)))}
                  onDelete={() => (tax.statuses.length > 1 ? askDelete({ kind: "statuses", id: x.id }) : setMsg({ ok: false, text: "Debe quedar al menos un estado." }))}
                />
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" onClick={() => patch((t) => t.statuses.push({ id: "", label: "", color: "#475569", visible: true, flag: true }))}>
            + Añadir estado
          </button>
        </div>
      )}
      <p className="muted small">
        Los ids (<code>{SLUG.source}</code>) identifican cada elemento en las fichas y no se pueden cambiar una vez guardados. Sí puedes renombrar, cambiar iconos y colores, y reordenar.
      </p>
    </div>
  );
}
