/**
 * Ingesta: archivos/*.txt  →  data/<category>.json
 *
 * - Repara la codificación de cada línea (UTF-8 / GB18030 / Windows-1252).
 * - Divide cada fichero en "posts" (separados por ≥2 líneas en blanco).
 * - Modo "links": extrae una entrada por enlace/repositorio (con título y descripción).
 * - Modo "notes": una entrada por post (apuntes, packs de prompts).
 * - Clasifica por subcategoría y tags con reglas de palabras clave.
 * - Deduplica por repositorio de GitHub / URL normalizada.
 * - Respeta las ediciones manuales: una entrada existente con updatedAt ≠ createdAt
 *   o con source.file === "manual" NUNCA se sobrescribe.
 *
 * Uso: npm run ingest
 */
import fs from "node:fs";
import path from "node:path";
import { EntryListSchema, type Entry } from "../src/lib/schema.ts";
import { loadTaxonomy, saveTaxonomy } from "./taxonomy-node.ts";

type CategoryId = string;
const TAX = loadTaxonomy();
const CATEGORIES = TAX.categories;
import { curatedEntries } from "./curated.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "archivos");
const OUT = path.join(ROOT, "data");
const NOW = new Date().toISOString();

type Mode = "links" | "notes";
type FileCfg = { file: string; mode: Mode; category: CategoryId; subcategory?: string; tags?: string[] };

// El orden importa: en duplicados gana la primera aparición (ficheros más específicos primero).
const FILES: FileCfg[] = [
  { file: "Repositorios futbol directos de github.txt", mode: "links", category: "futbol", subcategory: "datos" },
  { file: "Repositorios Scraping o futbol.txt", mode: "links", category: "repos", subcategory: "scraping" },
  { file: "SoloVideo.txt", mode: "links", category: "repos", subcategory: "video" },
  { file: "SoloAudio.txt", mode: "links", category: "repos", subcategory: "audio-voz" },
  { file: "Repositorios de conocimientos.txt", mode: "links", category: "aprendizaje" },
  { file: "Repositorios.txt", mode: "links", category: "repos" },
  { file: "Herramientas.txt", mode: "links", category: "herramientas" },
  { file: "Apuntes Futbol.txt", mode: "notes", category: "futbol", subcategory: "scouting" },
  { file: "Apuntes Tecnologia.txt", mode: "notes", category: "conceptos" },
  { file: "Prompts.txt", mode: "notes", category: "prompts" },
];

/* ------------------------------------------------------------------ encoding */

const utf8 = new TextDecoder("utf-8", { fatal: true });
const gb = new TextDecoder("gb18030");
const cp1252 = new TextDecoder("windows-1252");
const CJK = /[㐀-鿿豈-﫿�]/;

function decodeLine(bytes: Buffer): string {
  try {
    return utf8.decode(bytes);
  } catch {
    const g = gb.decode(bytes);
    return CJK.test(g) ? cp1252.decode(bytes) : g;
  }
}

function readLines(file: string): string[] {
  const buf = fs.readFileSync(path.join(SRC, file));
  const lines: string[] = [];
  let start = 0;
  for (let i = 0; i <= buf.length; i++) {
    if (i === buf.length || buf[i] === 0x0a) {
      lines.push(decodeLine(buf.subarray(start, i)).replace(/\r$/, "").replace(/\u0085/g, ""));
      start = i + 1;
    }
  }
  return lines;
}

/* ------------------------------------------------------------------ helpers */

const URL_RE = /https?:\/\/[^\s<>"'`)\]]+/g;
const NUMBERED_RE = /^\s*(?:\d{1,2}\s*[.)/]\s*|\*{2,}\s*|-\d+\.\s*)(?=[^\s\d])/;
const GH_RE = /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i;
const GH_RESERVED = new Set(["topics", "features", "orgs", "sponsors", "settings", "marketplace", "search", "collections"]);

function cleanUrl(u: string): string {
  return u.replace(/[.,;:!?…]+$/, "").replace(/\?(twclid|utm_[a-z]+)=[^&]*.*$/, "");
}

function ghOf(url: string): { owner: string; repo: string } | undefined {
  const m = url.match(GH_RE);
  if (!m || GH_RESERVED.has(m[1].toLowerCase())) return undefined;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

function slugify(s: string, max = 60): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

function hash(s: string): string {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36).slice(0, 5);
}

const EMOJI_RE = /[\p{Extended_Pictographic}️‍⃣]/gu;
function tidy(s: string): string {
  return s
    .replace(EMOJI_RE, "")
    .replace(/\?{2,}|￼/g, " ")
    .replace(/^[\s•→↳👉\-*#>:]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Limpia un título: sin numeración, sin ":" final, longitud razonable. */
function cleanTitle(s: string): string {
  return tidy(s).replace(/[:：\s—–-]+$/, "").replace(/（.*?）|\(aprox[^)]*\)/g, "").trim();
}

function stripNumber(line: string): string {
  return tidy(line.replace(NUMBERED_RE, "").replace(URL_RE, "").replace(/\s*[—–-]\s*$/, ""));
}

function isLabelLine(l: string): boolean {
  return /^\s*(github|repo|repositorio|enlace|link|web|url)\s*:?\s*$/i.test(l);
}

function summarize(lines: string[], max = 280): string {
  const text = lines.map(tidy).filter((l) => l && !isLabelLine(l)).join(" ");
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return (dot > 120 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
}

function splitPosts(lines: string[]): { start: number; lines: string[] }[] {
  const posts: { start: number; lines: string[] }[] = [];
  let cur: string[] = [];
  let start = 0;
  let blanks = 0;
  lines.forEach((l, i) => {
    if (!l.trim()) {
      blanks++;
      if (blanks >= 2 && cur.length) {
        posts.push({ start, lines: cur });
        cur = [];
      } else if (cur.length) cur.push("");
      return;
    }
    if (!cur.length) start = i + 1;
    blanks = 0;
    cur.push(l);
  });
  if (cur.length) posts.push({ start, lines: cur });
  return posts.map((p) => ({ ...p, lines: trimBlank(p.lines) }));
}

function trimBlank(ls: string[]): string[] {
  let a = 0;
  let b = ls.length;
  while (a < b && !ls[a].trim()) a++;
  while (b > a && !ls[b - 1].trim()) b--;
  return ls.slice(a, b);
}

/* ------------------------------------------------------------------ classification */

type Rule = { sub?: string; tags: string[]; re: RegExp };
const RULES: Rule[] = [
  { sub: "claude-code", tags: ["claude-code"], re: /claude[ -]?code|\bclaude\b.*\b(skill|hook|plugin)s?\b|anthropic/i },
  { sub: "mcp", tags: ["mcp"], re: /\bmcp\b|model context protocol/i },
  { sub: "agentes-ia", tags: ["agentes"], re: /\bagent(e|es|s|ic)?\b|multi-?agent|autonom/i },
  { sub: "video", tags: ["video"], re: /v[ií]deo|capcut|subt[ií]tulo|avatar/i },
  { sub: "audio-voz", tags: ["audio"], re: /\btts\b|voz|voice|audio|whisper|transcri|podcast/i },
  { sub: "scraping", tags: ["scraping"], re: /scrap|crawl|extrae[r]? datos/i },
  { sub: "seguridad", tags: ["seguridad"], re: /segur|security|pentest|hacking|osint|vulnerab|red team|malware|ciberseg|ctf\b/i },
  { sub: "self-hosted", tags: ["self-hosted"], re: /self-?host|autoaloj|docker|homelab|\bnas\b|jellyfin|plex|radarr|sonarr/i },
  { sub: "diseno", tags: ["diseno"], re: /dise[ñn]o|figma|\bui\b|\bux\b|frontend|landing/i },
  { tags: ["llm"], re: /\bllms?\b|gpt|gemini|deepseek|ollama|qwen|kimi|grok|chatgpt/i },
  { tags: ["rag"], re: /\brag\b|embedding|vector/i },
  { tags: ["ocr"], re: /\bocr\b/i },
  { tags: ["python"], re: /python|pandas|jupyter/i },
  { tags: ["javascript"], re: /javascript|typescript|\bnode(\.js)?\b|react|next\.js/i },
  { tags: ["data-science"], re: /data scien|ciencia de datos|estad[ií]stic|anal[ií]tica|analytics/i },
  { tags: ["machine-learning"], re: /machine learning|aprendizaje autom|deep learning|\bml\b|redes neuronales/i },
  { tags: ["linux"], re: /linux|bash|terminal|sysadmin|\bcli\b/i },
  { tags: ["notebooklm"], re: /notebooklm/i },
  { tags: ["gratis"], re: /gratis|gratuit|free\b/i },
  { tags: ["open-source"], re: /open[- ]source|c[oó]digo abierto/i },
  { tags: ["automatizacion"], re: /automatiz|n8n|zapier|workflow/i },
  { tags: ["productividad"], re: /productividad|productivity|notion|obsidian/i },
  { tags: ["vision-computacional"], re: /computer vision|visi[oó]n (por )?computa|yolo|detecci[oó]n de objetos|tracking/i },
  { tags: ["futbol"], re: /f[uú]tbol|football|soccer|statsbomb|fbref|transfermarkt|scout|t[aá]ctic/i },
  { tags: ["marketing"], re: /marketing|seo\b|ventas|copywriting|redes sociales|instagram|tiktok|linkedin/i },
  { tags: ["estudio"], re: /estudi|examen|aprend|tutor|curso|clase/i },
];

const LEARN_SUBS: [string, RegExp][] = [
  ["machine-learning", /machine learning|deep learning|\bml\b|\bia\b|\bai\b|llm|neural/i],
  ["data-science", /data|datos|estad[ií]stic|pandas|sql|anal[ií]/i],
  ["ciberseguridad", /segur|security|hack|pentest|ctf/i],
  ["cursos-libros", /curso|libro|book|youtube|universidad|course|gu[ií]a/i],
  ["programacion", /.*/],
];
const TOOL_SUBS: [string, RegExp][] = [
  ["seguridad", /segur|security|vulnerab|malware|hack|osint/i],
  ["self-hosted", /self-?host|docker|nas\b|jellyfin|plex|radarr|sonarr|homelab/i],
  ["multimedia", /v[ií]deo|audio|imagen|foto|m[uú]sica|pdf/i],
  ["diseno", /dise[ñn]o|presentaci|canva|figma/i],
  ["ia", /\bia\b|\bai\b|gpt|claude|llm|gemini|prompt|agente/i],
  ["productividad", /.*/],
];
const PROMPT_SUBS: [string, RegExp][] = [
  ["estudio", /estudi|examen|aprend|tutor|notebooklm|clase/i],
  ["desarrollo", /c[oó]digo|program|developer|claude code|software|ingenier/i],
  ["marketing", /marketing|ventas|contenido|redes|viral|instagram|tiktok|copy/i],
  ["analisis", /.*/],
];
const NOTE_SUBS: [string, RegExp][] = [
  ["servicios-ia", /\bia\b|\bai\b|gpt|claude|llm|gemini|notebooklm|agente/i],
  ["arquitectura", /arquitect|sistema|servidor|docker|linux|red\b|cloud/i],
  ["buenas-practicas", /.*/],
];

function pick(subs: [string, RegExp][], text: string): string {
  return subs.find(([, re]) => re.test(text))![0];
}

function classify(cfg: FileCfg, title: string, text: string): { category: CategoryId; subcategory?: string; tags: string[] } {
  const hay = `${title}\n${text}`;
  const tags = new Set<string>(cfg.tags ?? []);
  let sub: string | undefined;
  for (const r of RULES) {
    if (r.re.test(hay)) {
      r.tags.forEach((t) => tags.add(t));
      if (!sub && r.sub) sub = r.sub;
    }
  }
  let category = cfg.category;
  // Contenido de fútbol fuera de los ficheros de fútbol → categoría fútbol.
  if (category !== "futbol" && /f[uú]tbol|football|soccer|statsbomb|fbref|transfermarkt/i.test(hay)) category = "futbol";
  if (category === "conceptos" && (hay.match(/prompt|“/gi)?.length ?? 0) >= 4) category = "prompts";

  switch (category) {
    case "repos":
      sub = cfg.subcategory ?? sub ?? "dev-tools";
      break;
    case "aprendizaje":
      sub = pick(LEARN_SUBS, hay);
      break;
    case "herramientas":
      sub = pick(TOOL_SUBS, hay);
      break;
    case "prompts":
      sub = pick(PROMPT_SUBS, hay);
      break;
    case "conceptos":
      sub = pick(NOTE_SUBS, hay);
      break;
    case "futbol":
      sub = /vision|visi[oó]n|detect|tracking|yolo/i.test(hay) ? "vision-computacional" : /scout|t[aá]ctic|jugador/i.test(hay) && cfg.mode === "notes" ? "scouting" : "datos";
      tags.add("futbol");
      break;
  }
  return { category, subcategory: sub, tags: [...tags].slice(0, 8) };
}

/* ------------------------------------------------------------------ parsing */

type Draft = {
  title: string;
  descLines: string[];
  urls: string[];
  line: number;
  rawLines: string[];
};

function urlsIn(line: string): string[] {
  return (line.match(URL_RE) ?? []).map(cleanUrl);
}

/** Divide un post en items con enlace. */
function parseLinkPost(post: { start: number; lines: string[] }): { drafts: Draft[]; orphan: boolean } {
  const L = post.lines;
  const numberedIdx = L.map((l, i) => (NUMBERED_RE.test(l) && stripNumber(l).length <= 90 ? i : -1)).filter((i) => i >= 0);
  const drafts: Draft[] = [];

  if (numberedIdx.length >= 1) {
    // Segmentos que empiezan en cada línea numerada.
    const header = L.slice(0, numberedIdx[0]);
    const segs = numberedIdx.map((s, k) => ({ s, e: k + 1 < numberedIdx.length ? numberedIdx[k + 1] : L.length }));
    // Si la cabecera contiene enlaces (post de un solo item con lista interna), tratarlo como post simple.
    if (header.some((l) => URL_RE.test(l)) && segs.every((g) => !L.slice(g.s, g.e).some((l) => urlsIn(l).length))) {
      return parseSimple(post);
    }
    let last: Draft | undefined;
    for (const g of segs) {
      const seg = L.slice(g.s, g.e);
      const urls = seg.flatMap(urlsIn);
      const titleLine = stripNumber(seg[0]);
      const desc = seg.slice(1).filter((l) => !urlsIn(l).length || tidy(l.replace(URL_RE, "")).length > 15);
      const descClean = desc.map((l) => l.replace(URL_RE, "")).filter((l) => l.trim());
      if (urls.length) {
        last = { title: titleLine, descLines: descClean, urls, line: post.start + g.s, rawLines: seg };
        drafts.push(last);
      } else if (last) {
        last.descLines.push(...seg);
        last.rawLines.push(...seg);
      }
    }
    // Pasos numerados ("1. Instala… 2. Pregunta…") con un único enlace al final → es un solo item.
    const withUrl = segs.filter((g) => L.slice(g.s, g.e).some((l) => urlsIn(l).length)).length;
    if (drafts.length && !(withUrl === 1 && segs.length > 1 && header.length > 0)) return { drafts, orphan: false };
    drafts.length = 0;
  }
  return parseSimple(post);
}

/** Texto acumulado → se cierra al encontrar un grupo de URLs. */
function parseSimple(post: { start: number; lines: string[] }): { drafts: Draft[]; orphan: boolean } {
  const drafts: Draft[] = [];
  let buf: string[] = [];
  let bufStart = post.start;
  let i = 0;
  const L = post.lines;
  while (i < L.length) {
    const line = L[i];
    const urls = urlsIn(line);
    // Línea "dominio.com  descripción" sin protocolo (listas de herramientas).
    const bare = !urls.length && line.match(/^\s*([a-z0-9-]+\.(?:com|ai|org|io|net|app|dev|fun|so|co)(?:\/\S*)?)\s+(.{8,})$/i);
    if (bare) {
      drafts.push({ title: bare[1].replace(/\/(es\/)?$/, ""), descLines: [bare[2]], urls: ["https://" + bare[1]], line: post.start + i, rawLines: [line] });
      i++;
      continue;
    }
    if (!urls.length) {
      if (!buf.length) bufStart = post.start + i;
      buf.push(line);
      i++;
      continue;
    }
    const rest = tidy(line.replace(URL_RE, "").replace(/[—–-]+/g, " "));
    // Línea con URL + descripción propia ("http://x.com — hace tal cosa")
    if (rest.length > 12 && buf.filter((l) => l.trim()).length === 0) {
      drafts.push({ title: "", descLines: [rest], urls, line: post.start + i, rawLines: [line] });
      i++;
      continue;
    }
    // Grupo de URLs consecutivas (permitiendo líneas en blanco / etiquetas).
    const group = [...urls];
    const raw = [...buf, line];
    let j = i + 1;
    while (j < L.length && (urlsIn(L[j]).length || !L[j].trim() || isLabelLine(L[j]))) {
      if (urlsIn(L[j]).length && tidy(L[j].replace(URL_RE, "")).length > 12) break;
      group.push(...urlsIn(L[j]));
      raw.push(L[j]);
      j++;
    }
    const text = buf.filter((l) => l.trim() && !isLabelLine(l));
    if (rest) text.push(rest);
    const firstLine = text[0] ? tidy(text[0]) : "";
    const useFirstAsTitle = firstLine.length > 0 && firstLine.length <= 60 && text.length > 1 && !/[.!?:]$/.test(firstLine);
    drafts.push({
      title: useFirstAsTitle ? stripNumber(text[0]) : "",
      descLines: useFirstAsTitle ? text.slice(1) : text,
      urls: group,
      line: bufStart,
      rawLines: raw,
    });
    buf = [];
    i = j;
  }
  const leftover = buf.filter((l) => l.trim());
  if (leftover.length && drafts.length) {
    drafts[drafts.length - 1].descLines.push(...leftover);
    drafts[drafts.length - 1].rawLines.push(...leftover);
  }
  return { drafts, orphan: drafts.length === 0 };
}

function prettyRepo(repo: string): string {
  return repo.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function linkLabel(url: string): string {
  const gh = ghOf(url);
  if (gh) return `GitHub · ${gh.owner}/${gh.repo}`;
  const d = domainOf(url);
  if (d === "x.com" || d === "twitter.com") return "Post en X";
  if (d === "lnkd.in") return "LinkedIn (enlace acortado)";
  if (d.includes("youtube")) return "YouTube";
  return d;
}

/* ------------------------------------------------------------------ build entries */

const byKey = new Map<string, Entry>();
const order: string[] = [];

function put(key: string, e: Entry) {
  const prev = byKey.get(key);
  if (!prev) {
    byKey.set(key, e);
    order.push(key);
    return;
  }
  // Fusionar duplicados: si la primera aparición no tenía descripción, adoptar la nueva.
  if (prev.status === "review" && e.status === "active") {
    prev.title = e.title;
    prev.summary = e.summary;
    prev.body = e.body;
    prev.status = "active";
  }
  prev.tags = [...new Set([...prev.tags, ...e.tags])].slice(0, 10);
  if (e.summary.length > prev.summary.length && prev.summary.length < 60) prev.summary = e.summary;
  if (!prev.body && e.body) prev.body = e.body;
  if (!prev.image && e.image) prev.image = e.image;
  const links = new Map((prev.links ?? []).map((l) => [l.url, l]));
  (e.links ?? []).forEach((l) => links.set(l.url, l));
  if (links.size) prev.links = [...links.values()];
}

function makeId(prefix: string, base: string, salt: string): string {
  const s = slugify(base, 50) || "entrada";
  return `${prefix}-${s}-${hash(salt)}`;
}

function draftToEntries(cfg: FileCfg, d: Draft) {
  const ghUrls = [...new Map(d.urls.map((u) => [ghOf(u), u] as const).filter(([g]) => g).map(([g, u]) => [`${g!.owner}/${g!.repo}`.toLowerCase(), u])).values()];
  const others = [...new Set(d.urls.filter((u) => !ghOf(u)))];
  const descText = d.descLines.join("\n");
  const sharedSummary = summarize(d.descLines);
  const body = d.rawLines.join("\n").trim();

  if (ghUrls.length) {
    for (const u of ghUrls) {
      const gh = ghOf(u)!;
      const single = ghUrls.length === 1;
      let title = single && d.title ? cleanTitle(d.title) : prettyRepo(gh.repo);
      let summary = sharedSummary;
      // "***** Descripción larga" → la línea numerada es la descripción, no el título.
      if (title.length > 60) {
        if (!summary) summary = title;
        title = prettyRepo(gh.repo);
      }
      if (!title) title = prettyRepo(gh.repo);
      const cls = classify(cfg, title, `${descText}\n${gh.owner}/${gh.repo}`);
      const key = `gh:${gh.owner}/${gh.repo}`.toLowerCase();
      const entry: Entry = {
        id: `gh-${slugify(`${gh.owner}-${gh.repo}`, 70)}`,
        type: cls.category === "aprendizaje" ? "course" : "repo",
        title,
        summary: summary || `Repositorio ${gh.owner}/${gh.repo}.`,
        body: body.length > summary.length + 40 ? body : undefined,
        url: `https://github.com/${gh.owner}/${gh.repo}`,
        links: others.length && single ? others.map((url) => ({ label: linkLabel(url), url })) : undefined,
        github: gh,
        ...cls,
        source: { file: cfg.file, line: d.line },
        status: summary || (single && d.title && title !== prettyRepo(gh.repo)) ? "active" : "review",
        createdAt: NOW,
        updatedAt: NOW,
      };
      put(key, entry);
    }
    return;
  }
  if (!others.length) return;
  const summary = sharedSummary;
  const main = others[0];
  const d0 = domainOf(main);
  const social = /^(x\.com|twitter\.com|lnkd\.in|linkedin\.com)$/.test(d0);
  const title = cleanTitle(d.title) || (summary && social ? cleanTitle(summarize([d.descLines[0] ?? ""], 70)) : "") || (social ? linkLabel(main) : d0);
  const cls = classify(cfg, title, descText);
  const type: Entry["type"] = d0.includes("youtube") || cls.category === "aprendizaje" ? "course" : social ? "note" : "tool";
  const key = `url:${main.toLowerCase().replace(/\/+$/, "")}`;
  put(key, {
    id: makeId(type, title, main),
    type,
    title: title.slice(0, 150),
    summary: summary || title,
    body: body.length > summary.length + 40 ? body : undefined,
    url: main,
    links: others.length > 1 ? others.slice(1).map((url) => ({ label: linkLabel(url), url })) : undefined,
    ...cls,
    tags: d0 === "lnkd.in" ? [...cls.tags, "enlace-acortado"] : cls.tags,
    source: { file: cfg.file, line: d.line },
    status: summary && d0 !== "lnkd.in" ? "active" : "review",
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function noteEntry(cfg: FileCfg, post: { start: number; lines: string[] }) {
  const text = post.lines.join("\n").trim();
  if (text.length < 80) return;
  const first = post.lines.find((l) => tidy(l).length > 3) ?? "";
  const title = cleanTitle(summarize([first], 110)).replace(/[.…]+$/, "") || "Apunte";
  const rest = post.lines.slice(post.lines.indexOf(first) + 1);
  const cls = classify(cfg, title, text);
  const urls = [...new Set(post.lines.flatMap(urlsIn))];
  const isPrompt = cls.category === "prompts";
  const type: Entry["type"] = isPrompt ? "prompt" : "note";
  put(`note:${hash(text)}:${post.start}`, {
    id: makeId(type, title, text),
    type,
    title,
    summary: summarize(rest, 240) || title,
    body: text,
    url: urls[0],
    links: urls.length > 1 ? urls.slice(1).map((url) => ({ label: linkLabel(url), url })) : undefined,
    ...cls,
    source: { file: cfg.file, line: post.start },
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
  });
}

/* ------------------------------------------------------------------ main */

const stats: Record<string, number> = {};
for (const cfg of FILES) {
  const before = byKey.size;
  const posts = splitPosts(readLines(cfg.file));
  for (const post of posts) {
    if (cfg.mode === "notes") {
      noteEntry(cfg, post);
      continue;
    }
    const { drafts, orphan } = parseLinkPost(post);
    drafts.forEach((d) => draftToEntries(cfg, d));
    if (orphan) noteEntry({ ...cfg }, post);
  }
  stats[cfg.file] = byKey.size - before;
}

for (const e of curatedEntries(NOW)) put(e.github ? `gh:${e.github.owner}/${e.github.repo}`.toLowerCase() : `curated:${e.id}`, e);

// Unicidad de ids
const generated = order.map((k) => byKey.get(k)!);
const seen = new Set<string>();
for (const e of generated) {
  let id = e.id;
  let n = 2;
  while (seen.has(id)) id = `${e.id}-${n++}`;
  e.id = id;
  seen.add(id);
}

// Conservar ediciones manuales y entradas añadidas a mano.
fs.mkdirSync(OUT, { recursive: true });
const existing = new Map<string, Entry>();
for (const c of CATEGORIES) {
  const f = path.join(OUT, `${c.id}.json`);
  if (fs.existsSync(f)) for (const e of JSON.parse(fs.readFileSync(f, "utf8")) as Entry[]) existing.set(e.id, e);
}
const final = new Map<string, Entry>();
for (const e of generated) {
  const old = existing.get(e.id);
  if (old && (old.updatedAt !== old.createdAt || old.source.file === "manual")) final.set(e.id, old);
  else final.set(e.id, old ? { ...e, createdAt: old.createdAt, updatedAt: old.createdAt } : e);
}
for (const [id, e] of existing) if (!final.has(id) && (e.source.file === "manual" || e.updatedAt !== e.createdAt)) final.set(id, e);

const all = EntryListSchema.parse([...final.values()]);

// Registrar en la taxonomía las subcategorías nuevas que produzcan las reglas de clasificación.
let newSubs = 0;
for (const e of all) {
  const c = CATEGORIES.find((x) => x.id === e.category);
  if (c && e.subcategory && !c.subcategories.some((s) => s.id === e.subcategory)) {
    c.subcategories.push({ id: e.subcategory, name: e.subcategory.replace(/-/g, " ").replace(/^./, (m) => m.toUpperCase()) });
    newSubs++;
  }
}
if (newSubs) (saveTaxonomy(TAX), console.log(`Subcategorías nuevas registradas en config/taxonomy.json: ${newSubs}`));
for (const c of CATEGORIES) {
  const list = all.filter((e) => e.category === c.id);
  fs.writeFileSync(path.join(OUT, `${c.id}.json`), JSON.stringify(list, null, 2) + "\n");
  console.log(`${c.id.padEnd(13)} ${String(list.length).padStart(4)} entradas`);
}
console.log("\nPor fichero de origen:", stats);
console.log(`Total: ${all.length} · en revisión: ${all.filter((e) => e.status === "review").length}`);
