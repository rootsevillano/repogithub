import MiniSearch from "minisearch";
import type { Entry } from "./schema";
import { htmlToText } from "./html";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buildIndex(entries: Entry[]) {
  const ms = new MiniSearch<Entry>({
    fields: ["title", "tagsText", "summary", "repoText", "body"],
    storeFields: ["id"],
    extractField: (doc, field) => {
      if (field === "tagsText") return [...doc.tags, doc.subcategory ?? ""].join(" ");
      if (field === "body") return doc.body && doc.bodyFormat === "html" ? htmlToText(doc.body) : (doc.body ?? "");
      if (field === "repoText") return doc.github ? `${doc.github.owner} ${doc.github.repo}` : (doc.url ?? "");
      return (doc as Record<string, unknown>)[field] as string;
    },
    processTerm: (t) => (t.length > 1 ? strip(t) : null),
    searchOptions: { boost: { title: 4, tagsText: 3, repoText: 2, summary: 1.5 }, prefix: true, fuzzy: 0.15, combineWith: "AND" },
  });
  ms.addAll(entries);
  return ms;
}
