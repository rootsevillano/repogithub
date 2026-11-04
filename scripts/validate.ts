/** Valida todos los JSON de /data contra el esquema y comprueba ids únicos. Uso: npm run validate */
import fs from "node:fs";
import path from "node:path";
import { CATEGORIES, EntryListSchema } from "../src/lib/schema.ts";

const DATA = path.resolve(import.meta.dirname, "..", "data");
const ids = new Set<string>();
let errors = 0;
let total = 0;
for (const c of CATEGORIES) {
  const f = path.join(DATA, `${c.id}.json`);
  const res = EntryListSchema.safeParse(JSON.parse(fs.readFileSync(f, "utf8")));
  if (!res.success) {
    errors++;
    console.error(`✗ ${c.id}.json`, res.error.issues.slice(0, 5));
    continue;
  }
  for (const e of res.data) {
    if (ids.has(e.id)) (errors++, console.error(`✗ id duplicado: ${e.id}`));
    if (e.category !== c.id) (errors++, console.error(`✗ ${e.id} está en ${c.id}.json pero su categoría es ${e.category}`));
    ids.add(e.id);
  }
  total += res.data.length;
}
console.log(errors ? `${errors} errores` : `✓ ${total} entradas válidas`);
process.exit(errors ? 1 : 0);
