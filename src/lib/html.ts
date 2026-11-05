import DOMPurify from "dompurify";

/** Etiquetas y atributos que puede producir el editor enriquecido. Todo lo demás se elimina. */
const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "mark", "span", "a", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "code", "hr"];
const ALLOWED_ATTR = ["href", "target", "rel", "style", "data-color"];
const SAFE_STYLE = /^\s*(text-align\s*:\s*(left|center|right|justify)|color\s*:\s*(#[0-9a-f]{3,8}|rgb\([\d\s,.]+\))|background-color\s*:\s*(#[0-9a-f]{3,8}|rgb\([\d\s,.]+\)))\s*;?\s*$/i;

let hooked = false;
function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node instanceof HTMLAnchorElement) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    const style = node.getAttribute?.("style");
    if (style) {
      const kept = style.split(";").filter((d) => SAFE_STYLE.test(d)).join(";");
      if (kept) node.setAttribute("style", kept);
      else node.removeAttribute("style");
    }
  });
}

export function sanitizeHtml(html: string): string {
  ensureHooks();
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP: /^(https?:|mailto:|#)/i });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Convierte texto plano (formato original de la ingesta) a HTML para abrirlo en el editor. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((para) => {
      const inner = esc(para)
        .replace(/https?:\/\/[^\s<>"')\]]+/g, (u) => `<a href="${u.replace(/[.,;:!?…]+$/, "")}">${u}</a>`)
        .replace(/\n/g, "<br>");
      return `<p>${inner}</p>`;
    })
    .join("");
}

/** Texto plano a partir de HTML (para búsqueda y «Copiar prompt»). */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
