/**
 * Utilidades para X (Twitter): longitud ponderada y generador de hilos.
 *
 * Recuento (como twitter-text v3, el que usa X):
 *  - Caracteres latinos y puntuación común (U+0000–U+10FF, U+2000–U+200D, U+2010–U+201F, U+2032–U+2037): 1.
 *  - Emojis (secuencias completas, con modificadores/ZWJ): 2.
 *  - Resto (CJK, símbolos…): 2 por carácter.
 *  - URLs: 23 siempre (acortador t.co).
 *  - Hashtags: cada carácter cuenta normalmente (incluido «#»).
 */
import type { Entry } from "./schema";
import { THREAD_MAX } from "./schema";
import type { Category, EntryType } from "./taxonomy";
import { htmlToText } from "./html";

export const TWEET_MAX = 280;
const URL_WEIGHT = 23;
const URL_RE = /\bhttps?:\/\/[^\s<>"']+|\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|ai|dev|app|co|es|me|gg|ly|so|sh|xyz|tech|info|edu|gov)(?:\/[^\s<>"']*)?/gi;
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
const LIGHT: [number, number][] = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("es", { granularity: "grapheme" }) : null;
const graphemes = (s: string) => (segmenter ? [...segmenter.segment(s)].map((g) => g.segment) : [...s]);

function plainWeight(s: string): number {
  let n = 0;
  for (const g of graphemes(s)) {
    if (EMOJI_RE.test(g)) {
      n += 2;
      continue;
    }
    for (const ch of g) {
      const cp = ch.codePointAt(0)!;
      n += LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
    }
  }
  return n;
}

/** Longitud de un post tal como la cuenta X. */
export function tweetLength(text: string): number {
  const t = text.normalize("NFC");
  let n = 0;
  let last = 0;
  for (const m of t.matchAll(URL_RE)) {
    n += plainWeight(t.slice(last, m.index)) + URL_WEIGHT;
    last = m.index! + m[0].length;
  }
  return n + plainWeight(t.slice(last));
}

/** Recorta un texto por palabras hasta que quepa en `max` (añade «…»). */
export function fit(text: string, max: number): string {
  if (tweetLength(text) <= max) return text;
  const words = text.split(/(\s+)/);
  while (words.length && tweetLength(words.join("").trimEnd() + "…") > max) words.pop();
  const out = words.join("").trimEnd().replace(/[,.;:\-–—]+$/, "");
  return out ? out + "…" : [...text].slice(0, Math.max(0, max - 1)).join("") + "…";
}

/* ------------------------------------------------------------------ hashtags */

const KNOWN: Record<string, string> = {
  ia: "IA", ai: "AI", llm: "LLM", llms: "LLMs", mcp: "MCP", api: "API", rag: "RAG", ui: "UI", ux: "UX", seo: "SEO",
  github: "GitHub", gitHub: "GitHub", chatgpt: "ChatGPT", openai: "OpenAI", javascript: "JavaScript", typescript: "TypeScript",
  "open-source": "OpenSource", opensource: "OpenSource", "claude-code": "ClaudeCode", devops: "DevOps", nocode: "NoCode",
  "no-code": "NoCode", "self-hosted": "SelfHosted", "machine-learning": "MachineLearning", "data-science": "DataScience",
  python: "Python", futbol: "Fútbol", programacion: "Programación", diseno: "Diseño", ciberseguridad: "Ciberseguridad",
};

/** "claude-code" → "ClaudeCode"; "ia" → "IA". Devuelve null si no sirve como hashtag. */
export function toHashtag(tag: string): string | null {
  const k = tag.toLowerCase();
  if (KNOWN[k]) return KNOWN[k];
  const parts = k.split(/[-_\s]+/).filter(Boolean);
  if (!parts.length) return null;
  const h = parts.map((p) => (p.length <= 2 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1))).join("");
  if (/^\d+$/.test(h) || h.length > 24 || !/^[\p{L}\p{N}_]+$/u.test(h)) return null;
  return h;
}

const AI_RE = /\b(IA|AI|LLMs?|GPT|Claude|Gemini|agente|agent|prompt|modelo|ChatGPT|MCP)\b/i;

function pickHashtags(e: Entry, cat: Category, text: string): string[] {
  const out: string[] = [];
  const add = (h: string | null) => h && !out.some((x) => x.toLowerCase() === h.toLowerCase()) && out.push(h);
  e.tags.slice(0, 4).forEach((t) => add(toHashtag(t)));
  cat.hashtags.forEach(add);
  if (AI_RE.test(`${e.title} ${e.summary} ${text}`)) add("IA");
  if (e.github) (add("OpenSource"), add("GitHub"));
  return out.map((h) => `#${h}`);
}

/* ------------------------------------------------------------------ generador */

const POINT_EMOJIS = ["💡", "⚙️", "🔹", "📌", "🚀", "✨", "🔍", "🧩"];
const NUM_RESERVE = 6; // «10/10 »

/** Divide el contenido en frases/puntos aprovechables para el hilo. */
function chunksOf(text: string, skip: string[]): { text: string; bullet: boolean }[] {
  const seen = skip.map((s) => s.toLowerCase().replace(/\W+/g, " ").trim()).filter(Boolean);
  const out: { text: string; bullet: boolean }[] = [];
  for (const raw of text.split(/\n+/)) {
    let line = raw.trim();
    const bullet = /^([•\-*✅▸►→]|\d+[.)]\s)/.test(line);
    line = line.replace(/^([•\-*✅▸►→]|\d+[.)])\s*/, "").replace(URL_RE, "").replace(/\s{2,}/g, " ").trim();
    if (line.replace(/[^\p{L}\p{N}]/gu, "").length < 12) continue;
    const norm = line.toLowerCase().replace(/\W+/g, " ").trim();
    if (seen.some((s) => s.includes(norm) || norm.includes(s))) continue;
    seen.push(norm);
    if (bullet) out.push({ text: line, bullet: true });
    else for (const s of line.match(/[^.!?…]+[.!?…]*/g) ?? [line]) if (s.trim().length > 3) out.push({ text: s.trim(), bullet: false });
  }
  return out;
}

export type ThreadContext = { category: Category; type: EntryType };

/**
 * Genera un hilo (≤10 posts, cada uno ≤280 según X) a partir de una ficha:
 * gancho con título y resumen → puntos clave del contenido → repo/enlaces → cierre con llamada a la acción y hashtags.
 */
export function generateThread(e: Entry, { category, type }: ThreadContext): string[] {
  const text = e.body ? (e.bodyFormat === "html" ? htmlToText(e.body) : e.body) : "";
  const tags = pickHashtags(e, category, text);
  const room = TWEET_MAX - NUM_RESERVE;
  const icon = category.icon || type.icon || "🧵";

  // 1 · Gancho
  const hookTags = tags.slice(0, 3).join(" ");
  const hookHead = `${icon} ${e.title}`;
  const hookTail = `\n\n🧵👇 ${hookTags}`.trimEnd();
  const summary = e.summary && e.summary !== e.title ? e.summary : "";
  const hookSpace = room - tweetLength(hookHead + hookTail) - 2;
  const hook = summary && hookSpace > 30 ? `${hookHead}\n\n${fit(summary, hookSpace)}${hookTail}` : fit(hookHead, room - tweetLength(hookTail)) + hookTail;

  // Posts finales fijos: recurso/enlaces y cierre
  const tail: string[] = [];
  const links = (e.links ?? []).filter((l) => l.url !== e.url).slice(0, 4);
  if (e.github) {
    tail.push(`⭐ Repositorio: ${e.github.owner}/${e.github.repo}\n\n🔗 ${e.url ?? `https://github.com/${e.github.owner}/${e.github.repo}`}\n\nDale una estrella si te resulta útil 🙌`);
  } else if (e.url) {
    tail.push(`🔗 Aquí lo tienes:\n${e.url}`);
  }
  if (links.length) {
    let post = "📚 Más enlaces:";
    for (const l of links) {
      const line = `\n▸ ${fit(l.label, 60)}: ${l.url}`;
      if (tweetLength(post + line) <= room) post += line;
    }
    tail.push(post);
  }
  const closeTags = tags.slice(0, 5);
  let close = `♻️ ¿Te ha resultado útil? Comparte el hilo y sígueme para más recursos sobre ${category.name.toLowerCase()}.`;
  while (closeTags.length && tweetLength(`${close}\n\n${closeTags.join(" ")}`) > room) closeTags.pop();
  close = closeTags.length ? `${close}\n\n${closeTags.join(" ")}` : close;
  tail.push(close);

  // Puntos clave del contenido
  const maxBody = Math.max(0, THREAD_MAX - 1 - tail.length);
  const bodyPosts: string[] = [];
  let cur = "";
  let k = 0;
  const flush = () => {
    if (cur) bodyPosts.push(cur);
    cur = "";
  };
  for (const c of chunksOf(text, [e.title, summary])) {
    if (bodyPosts.length >= maxBody) break;
    const piece = c.bullet ? `✅ ${c.text}` : c.text;
    if (!cur) {
      const head = c.bullet ? piece : `${POINT_EMOJIS[k++ % POINT_EMOJIS.length]} ${piece}`;
      cur = fit(head, room);
    } else if (tweetLength(`${cur}${c.bullet ? "\n" : " "}${piece}`) <= room) {
      cur += `${c.bullet ? "\n" : " "}${piece}`;
    } else {
      flush();
      if (bodyPosts.length >= maxBody) break;
      cur = fit(c.bullet ? piece : `${POINT_EMOJIS[k++ % POINT_EMOJIS.length]} ${piece}`, room);
    }
  }
  if (bodyPosts.length < maxBody) flush();
  // Si no hay contenido, un post de contexto a partir del tipo/categoría.
  if (!bodyPosts.length && summary && hook.indexOf(summary) < 0 && maxBody > 0) bodyPosts.push(fit(`💡 ${summary}`, room));

  const posts = [hook, ...bodyPosts, ...tail].slice(0, THREAD_MAX);
  const n = posts.length;
  return n === 1 ? posts : posts.map((p, i) => `${i + 1}/${n} ${p}`);
}

/** Enlace para publicar un post en X (abre el compositor con el texto). */
export const intentUrl = (text: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
