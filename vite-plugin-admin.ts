/**
 * API de edición local (sólo en `npm run dev`; no existe en el build estático).
 *
 *   PUT    /api/entries        body: { entry: Entry, originalId?: string }  → crea o actualiza
 *   DELETE /api/entries/:id                                                  → elimina
 *   PUT    /api/taxonomy       body: { taxonomy: Taxonomy, remap?: Remap }  → guarda tipos/estados/categorías/subcategorías
 *
 * Escribe directamente en data/<category>.json y config/taxonomy.json. Vite detecta el cambio y recarga.
 * Protección: el servidor escucha en 127.0.0.1 y se rechazan peticiones cuyo Origin
 * no sea el propio servidor (evita CSRF desde otras webs abiertas en el navegador).
 */
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { EntrySchema, type Entry } from "./src/lib/schema";
import { TaxonomySchema, type Remap } from "./src/lib/taxonomy";
import { dataCategories, dataFile, loadTaxonomy, readCat, saveTaxonomy, taxonomyIssues, writeCat } from "./scripts/taxonomy-node";

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || "{}");
}

function sameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  return !origin || new URL(origin).host === req.headers.host;
}

/** Todas las categorías con fichero o en la taxonomía. */
function allCats() {
  return [...new Set([...loadTaxonomy().categories.map((c) => c.id), ...dataCategories()])];
}

export function adminApi(): Plugin {
  return {
    name: "techhub-admin-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/entries", async (req, res) => {
        try {
          if (!sameOrigin(req)) return send(res, 403, { error: "Origen no permitido" });

          if (req.method === "PUT") {
            const { entry, originalId } = (await readBody(req)) as { entry: unknown; originalId?: string };
            const now = new Date().toISOString();
            const parsed = EntrySchema.safeParse({ ...(entry as object), updatedAt: now });
            if (!parsed.success) return send(res, 400, { error: "Datos no válidos", issues: parsed.error.issues });
            const e = parsed.data;
            const problems = taxonomyIssues(e, loadTaxonomy());
            if (problems.length) return send(res, 400, { error: problems.join(" · ") });

            // Localizar la entrada original (puede cambiar de categoría o de id).
            let pos = -1;
            let fromCat: string | undefined;
            for (const c of allCats()) {
              const list = readCat(c);
              if (e.id !== originalId && list.some((x) => x.id === e.id)) return send(res, 409, { error: `Ya existe una entrada con id "${e.id}"` });
              const i = originalId ? list.findIndex((x) => x.id === originalId) : -1;
              if (i >= 0) {
                fromCat = c;
                pos = i;
                if (c !== e.category || originalId !== e.id) {
                  list.splice(i, 1);
                  writeCat(c, list);
                }
              }
            }
            const target = readCat(e.category);
            if (fromCat === e.category && originalId === e.id) target[pos] = e;
            else if (fromCat === e.category) target.splice(pos, 0, e);
            else target.unshift(e);
            writeCat(e.category, target);
            return send(res, 200, { ok: true, entry: e });
          }

          if (req.method === "DELETE") {
            const id = decodeURIComponent((req.url ?? "").replace(/^\//, ""));
            for (const c of allCats()) {
              const list = readCat(c);
              const i = list.findIndex((x) => x.id === id);
              if (i >= 0) {
                list.splice(i, 1);
                writeCat(c, list);
                return send(res, 200, { ok: true });
              }
            }
            return send(res, 404, { error: "No encontrada" });
          }
          send(res, 405, { error: "Método no permitido" });
        } catch (err) {
          send(res, 500, { error: String(err) });
        }
      });

      server.middlewares.use("/api/taxonomy", async (req, res) => {
        try {
          if (!sameOrigin(req)) return send(res, 403, { error: "Origen no permitido" });
          if (req.method !== "PUT") return send(res, 405, { error: "Método no permitido" });

          const body = (await readBody(req)) as { taxonomy: unknown; remap?: Remap };
          const parsed = TaxonomySchema.safeParse(body.taxonomy);
          if (!parsed.success) return send(res, 400, { error: parsed.error.issues.map((i) => i.message).join(" · ") });
          const tax = parsed.data;
          const remap = body.remap ?? {};

          // Cargar todas las fichas, aplicar reasignaciones y comprobar referencias.
          const cats = allCats();
          const entries: Entry[] = cats.flatMap((c) => readCat(c));
          const changed = new Set<string>();
          let moved = 0;
          for (const e of entries) {
            const before = JSON.stringify(e);
            const oldCat = e.category;
            if (remap.types?.[e.type]) e.type = remap.types[e.type];
            if (remap.statuses?.[e.status]) e.status = remap.statuses[e.status];
            if (e.subcategory) {
              const k = `${oldCat}/${e.subcategory}`;
              if (remap.subcategories && k in remap.subcategories) e.subcategory = remap.subcategories[k] || undefined;
            }
            if (remap.categories?.[e.category]) {
              e.category = remap.categories[e.category];
              // La subcategoría no existe en la nueva categoría: se quita.
              const nc = tax.categories.find((c) => c.id === e.category);
              if (e.subcategory && !nc?.subcategories.some((s) => s.id === e.subcategory)) e.subcategory = undefined;
            }
            if (JSON.stringify(e) !== before) {
              e.updatedAt = new Date().toISOString();
              changed.add(oldCat).add(e.category);
              moved++;
            }
          }
          const broken = new Map<string, number>();
          for (const e of entries) for (const p of taxonomyIssues(e, tax)) broken.set(p, (broken.get(p) ?? 0) + 1);
          if (broken.size)
            return send(res, 409, {
              error: "Hay fichas que usan elementos eliminados: " + [...broken].map(([p, n]) => `${p} (${n})`).join(" · ") + ". Reasígnalas antes de borrar.",
            });

          // Reescribir sólo los ficheros afectados; eliminar los de categorías borradas (ya vacíos).
          for (const c of changed) writeCat(c, entries.filter((e) => e.category === c));
          for (const c of tax.categories) if (!fs.existsSync(dataFile(c.id))) writeCat(c.id, []);
          for (const c of cats) if (!tax.categories.some((x) => x.id === c) && !entries.some((e) => e.category === c)) fs.rmSync(dataFile(c), { force: true });
          saveTaxonomy(tax);
          return send(res, 200, { ok: true, updated: moved });
        } catch (err) {
          send(res, 500, { error: String(err) });
        }
      });
    },
  };
}
