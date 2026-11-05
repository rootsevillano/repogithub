import type { Entry } from "./schema";
import type { Category, EntryType, Status, Taxonomy } from "./taxonomy";
import taxonomyJson from "../../config/taxonomy.json";

// Carga todos los JSON de /data. En `npm run dev`, Vite recarga (HMR) cuando cambian en disco.
const modules = import.meta.glob<Entry[]>("/data/*.json", { eager: true, import: "default" });

export const TAXONOMY = taxonomyJson as Taxonomy;
export const CATEGORIES = TAXONOMY.categories;
export const TYPES = TAXONOMY.types;
export const STATUSES = TAXONOMY.statuses;

export const ENTRIES: Entry[] = Object.values(modules).flat();
export const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const REPO_SLUG = "rootsevillano/repogithub";
export const IS_DEV = import.meta.env.DEV;

export function categoryOf(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? { id, name: id, icon: "📁", description: "", hashtags: [], subcategories: [] };
}
export function typeOf(id: string): EntryType {
  return TYPES.find((t) => t.id === id) ?? { id, label: id, icon: "•", color: "#6b7280" };
}
export function statusOf(id: string): Status {
  return STATUSES.find((s) => s.id === id) ?? { id, label: id, color: "#6b7280", visible: true, flag: true };
}
export function subcategoryName(cat: string, sub: string) {
  return categoryOf(cat).subcategories.find((s) => s.id === sub)?.name ?? sub.replace(/-/g, " ");
}
/** La ficha se muestra en el feed (su estado es visible). */
export const isVisible = (e: Entry) => statusOf(e.status).visible;

export function assetUrl(p: string) {
  return /^https?:/.test(p) ? p : `${import.meta.env.BASE_URL}${p.replace(/^\//, "")}`;
}

export function githubEditUrl(e: Entry) {
  return `https://github.com/${REPO_SLUG}/edit/main/data/${e.category}.json`;
}

export function countBy<T>(items: T[], key: (t: T) => string | string[] | undefined) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    for (const v of Array.isArray(k) ? k : k ? [k] : []) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Guarda una ficha mediante la API local (sólo en dev). */
export async function saveEntry(entry: Entry, originalId?: string) {
  const r = await fetch("/api/entries", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry, originalId }),
  });
  const res = await r.json();
  if (!r.ok) throw new Error(res.error + (res.issues ? `: ${res.issues.map((i: { path: string[]; message: string }) => `${i.path.join(".")} ${i.message}`).join(" · ")}` : ""));
  return res.entry as Entry;
}
