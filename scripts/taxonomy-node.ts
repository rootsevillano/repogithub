/** Lectura/escritura de config/taxonomy.json y de data/*.json desde Node (scripts y API local). */
import fs from "node:fs";
import path from "node:path";
import { TaxonomySchema, type Taxonomy } from "../src/lib/taxonomy.ts";
import type { Entry } from "../src/lib/schema.ts";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const DATA = path.join(ROOT, "data");
export const TAXONOMY_FILE = path.join(ROOT, "config", "taxonomy.json");

export function loadTaxonomy(): Taxonomy {
  return TaxonomySchema.parse(JSON.parse(fs.readFileSync(TAXONOMY_FILE, "utf8")));
}
export function saveTaxonomy(t: Taxonomy) {
  fs.writeFileSync(TAXONOMY_FILE, JSON.stringify(t, null, 2) + "\n");
}

export const dataFile = (cat: string) => path.join(DATA, `${cat}.json`);
/** Ficheros de datos existentes (una categoría por fichero). */
export function dataCategories(): string[] {
  return fs.existsSync(DATA) ? fs.readdirSync(DATA).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [];
}
export function readCat(cat: string): Entry[] {
  return fs.existsSync(dataFile(cat)) ? JSON.parse(fs.readFileSync(dataFile(cat), "utf8")) : [];
}
export function writeCat(cat: string, list: Entry[]) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(dataFile(cat), JSON.stringify(list, null, 2) + "\n");
}

/** Problemas de referencias de una ficha frente a la taxonomía (vacío = correcta). */
export function taxonomyIssues(e: Entry, t: Taxonomy): string[] {
  const out: string[] = [];
  const cat = t.categories.find((c) => c.id === e.category);
  if (!cat) out.push(`categoría desconocida «${e.category}»`);
  if (!t.types.some((x) => x.id === e.type)) out.push(`tipo desconocido «${e.type}»`);
  if (!t.statuses.some((x) => x.id === e.status)) out.push(`estado desconocido «${e.status}»`);
  if (cat && e.subcategory && !cat.subcategories.some((s) => s.id === e.subcategory)) out.push(`subcategoría desconocida «${e.subcategory}» en ${e.category}`);
  return out;
}
