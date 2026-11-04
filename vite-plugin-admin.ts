/**
 * API de edición local (sólo en `npm run dev`; no existe en el build estático).
 *
 *   PUT    /api/entries        body: { entry: Entry, originalId?: string }  → crea o actualiza
 *   DELETE /api/entries/:id                                                  → elimina
 *
 * Escribe directamente en data/<category>.json. Vite detecta el cambio y recarga el feed.
 * Protección: el servidor escucha en 127.0.0.1 y se rechazan peticiones cuyo Origin
 * no sea el propio servidor (evita CSRF desde otras webs abiertas en el navegador).
 */
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { CATEGORIES, EntrySchema, type Entry } from "./src/lib/schema";

const DATA = path.resolve(import.meta.dirname, "data");
const file = (cat: string) => path.join(DATA, `${cat}.json`);

function readCat(cat: string): Entry[] {
  return fs.existsSync(file(cat)) ? JSON.parse(fs.readFileSync(file(cat), "utf8")) : [];
}
function writeCat(cat: string, list: Entry[]) {
  fs.writeFileSync(file(cat), JSON.stringify(list, null, 2) + "\n");
}

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

export function adminApi(): Plugin {
  return {
    name: "techhub-admin-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/entries", async (req, res) => {
        try {
          const origin = req.headers.origin;
          if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: "Origen no permitido" });

          if (req.method === "PUT") {
            const { entry, originalId } = (await readBody(req)) as { entry: unknown; originalId?: string };
            const now = new Date().toISOString();
            const parsed = EntrySchema.safeParse({ ...(entry as object), updatedAt: now });
            if (!parsed.success) return send(res, 400, { error: "Datos no válidos", issues: parsed.error.issues });
            const e = parsed.data;

            // Localizar la entrada original (puede cambiar de categoría o de id).
            let pos = -1;
            let fromCat: string | undefined;
            for (const c of CATEGORIES) {
              const list = readCat(c.id);
              if (e.id !== originalId && list.some((x) => x.id === e.id)) return send(res, 409, { error: `Ya existe una entrada con id "${e.id}"` });
              const i = originalId ? list.findIndex((x) => x.id === originalId) : -1;
              if (i >= 0) {
                fromCat = c.id;
                pos = i;
                if (c.id !== e.category || originalId !== e.id) {
                  list.splice(i, 1);
                  writeCat(c.id, list);
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
            for (const c of CATEGORIES) {
              const list = readCat(c.id);
              const i = list.findIndex((x) => x.id === id);
              if (i >= 0) {
                list.splice(i, 1);
                writeCat(c.id, list);
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
    },
  };
}
