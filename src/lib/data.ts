import { CATEGORIES, type CategoryId, type Entry } from "./schema";

// Carga todos los JSON de /data. En `npm run dev`, Vite recarga (HMR) cuando cambian en disco.
const modules = import.meta.glob<Entry[]>("/data/*.json", { eager: true, import: "default" });

export const ENTRIES: Entry[] = Object.values(modules).flat();
export const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const REPO_SLUG = "rootsevillano/repogithub";
export const IS_DEV = import.meta.env.DEV;

export function categoryOf(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!;
}

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
