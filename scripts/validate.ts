/** Valida config/taxonomy.json y todos los JSON de /data (esquema, ids únicos y referencias). Uso: npm run validate */
import { EntryListSchema } from "../src/lib/schema.ts";
import { dataCategories, loadTaxonomy, readCat, taxonomyIssues } from "./taxonomy-node.ts";

const tax = loadTaxonomy(); // lanza si la taxonomía no es válida
const ids = new Set<string>();
let errors = 0;
let total = 0;
const files = [...new Set([...tax.categories.map((c) => c.id), ...dataCategories()])];
for (const cat of files) {
  const res = EntryListSchema.safeParse(readCat(cat));
  if (!res.success) {
    errors++;
    console.error(`✗ ${cat}.json`, res.error.issues.slice(0, 5));
    continue;
  }
  for (const e of res.data) {
    if (ids.has(e.id)) (errors++, console.error(`✗ id duplicado: ${e.id}`));
    if (e.category !== cat) (errors++, console.error(`✗ ${e.id} está en ${cat}.json pero su categoría es ${e.category}`));
    for (const p of taxonomyIssues(e, tax)) (errors++, console.error(`✗ ${e.id}: ${p}`));
    ids.add(e.id);
  }
  total += res.data.length;
}
console.log(errors ? `${errors} errores` : `✓ ${total} entradas válidas · ${tax.categories.length} categorías · ${tax.types.length} tipos · ${tax.statuses.length} estados`);
process.exit(errors ? 1 : 0);
