import type { CSSProperties } from "react";
import type { Entry } from "../lib/schema";
import { IS_DEV, statusOf, typeOf } from "../lib/data";

const tint = (color: string) => ({ "--c": color }) as CSSProperties;

export function TypeBadge({ type }: { type: string }) {
  const t = typeOf(type);
  return (
    <span className="badge" style={tint(t.color)}>
      {t.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = statusOf(status);
  if (!s.flag) return null;
  return (
    <span className="badge badge-status" style={tint(s.color)}>
      {s.label}
    </span>
  );
}

/** Distintivo de publicación en X (sólo visible en la edición local). */
export function XBadge({ entry }: { entry: Entry }) {
  if (!IS_DEV) return null;
  const pub = entry.twitter === "published";
  return (
    <span className={`xbadge ${pub ? "on" : ""}`} title={pub ? "Publicado en X" : "No publicado en X"}>
      𝕏 {pub ? "publicado" : entry.thread?.length ? "hilo listo" : "pendiente"}
    </span>
  );
}

export { tint };
