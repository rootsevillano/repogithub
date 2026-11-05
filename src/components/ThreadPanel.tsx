import { useEffect, useRef, useState } from "react";
import type { Entry } from "../lib/schema";
import { THREAD_MAX, TWITTER_STATES } from "../lib/schema";
import { categoryOf, saveEntry, typeOf } from "../lib/data";
import { TWEET_MAX, generateThread, intentUrl, tweetLength } from "../lib/twitter";

async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    return false;
  }
}

/** Panel de la ficha (sólo en local): estado de publicación en X y hilo generado/editable. */
export default function ThreadPanel({ entry: e, generateSignal = 0 }: { entry: Entry; generateSignal?: number }) {
  const root = useRef<HTMLElement>(null);
  const [posts, setPosts] = useState<string[]>(e.thread ?? []);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<number | "all" | null>(null);

  // Al recargar la ficha (tras guardar) se sincroniza con lo que hay en disco.
  useEffect(() => {
    setPosts(e.thread ?? []);
    setDirty(false);
  }, [e]);

  const persist = async (patch: Partial<Entry>, okText: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const next = { ...e, ...patch };
      if (!next.thread?.length) delete next.thread;
      await saveEntry(next, e.id);
      setDirty(false);
      setMsg({ ok: true, text: okText });
    } catch (err) {
      setMsg({ ok: false, text: String(err).replace(/^Error: /, "") });
    } finally {
      setBusy(false);
    }
  };

  const generate = () => {
    if (posts.length && !confirm("¿Sustituir el hilo actual por uno nuevo generado automáticamente?")) return;
    setPosts(generateThread(e, { category: categoryOf(e.category), type: typeOf(e.type) }));
    setDirty(true);
    setMsg({ ok: true, text: "Hilo generado. Revísalo, edítalo si quieres y pulsa «Guardar hilo»." });
  };

  // El botón «Generar hilo» de la cabecera de la ficha dispara la generación aquí.
  useEffect(() => {
    if (!generateSignal) return;
    generate();
    root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateSignal]);

  const edit = (i: number, v: string) => {
    setPosts((p) => p.map((x, j) => (j === i ? v : x)));
    setDirty(true);
  };
  const removePost = (i: number) => {
    setPosts((p) => p.filter((_, j) => j !== i));
    setDirty(true);
  };
  const addAfter = (i: number) => {
    setPosts((p) => [...p.slice(0, i + 1), "", ...p.slice(i + 1)]);
    setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => {
    setPosts((p) => {
      const n = [...p];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
    setDirty(true);
  };
  /** Renumera «n/N» al principio de cada post según el orden actual. */
  const renumber = () => {
    setPosts((p) => p.map((x, i) => `${i + 1}/${p.length} ${x.replace(/^\d+\/\d+\s*/, "")}`));
    setDirty(true);
  };

  const over = posts.filter((p) => tweetLength(p) > TWEET_MAX).length;
  const empty = posts.some((p) => !p.trim());
  const pub = e.twitter === "published";

  const doCopy = async (key: number | "all", text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    }
  };

  return (
    <section className="xpanel" aria-label="Publicación en X" ref={root}>
      <header className="xpanel-head">
        <div>
          <h2>
            <span className="xlogo" aria-hidden>
              𝕏
            </span>{" "}
            Hilo para X
          </h2>
          <p className="muted small">Máximo {THREAD_MAX} posts de {TWEET_MAX} caracteres. Las URLs cuentan 23 y los emojis 2.</p>
        </div>
        <label className="xstate">
          Twitter
          <select
            value={e.twitter ?? "unpublished"}
            disabled={busy}
            onChange={(ev) =>
              persist(
                { twitter: ev.target.value as Entry["twitter"], ...(dirty && !empty ? { thread: posts.map((p) => p.trim()).filter(Boolean) } : {}) },
                "Estado de publicación actualizado.",
              )
            }
            className={pub ? "is-pub" : ""}
          >
            {Object.entries(TWITTER_STATES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="actions">
        <button className="btn btn-primary" onClick={generate} disabled={busy}>
          🧵 {posts.length ? "Regenerar hilo" : "Generar hilo"}
        </button>
        {posts.length > 0 && (
          <>
            <button className="btn" onClick={() => persist({ thread: posts.map((p) => p.trim()).filter(Boolean) }, "Hilo guardado en la ficha.")} disabled={busy || !dirty || empty}>
              💾 Guardar hilo
            </button>
            <button className="btn" onClick={() => doCopy("all", posts.join("\n\n———\n\n"))}>
              {copied === "all" ? "¡Copiado!" : "Copiar hilo"}
            </button>
            <button className="btn" onClick={renumber} title="Vuelve a numerar 1/N, 2/N…">
              Renumerar
            </button>
            <span className="spacer" />
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={() => {
                if (!confirm("¿Borrar el hilo de esta ficha?")) return;
                if (e.thread?.length) persist({ thread: undefined }, "Hilo borrado.");
                else (setPosts([]), setDirty(false));
              }}
            >
              Borrar hilo
            </button>
          </>
        )}
      </div>

      {msg && <p className={msg.ok ? "notice" : "error"}>{msg.text}</p>}
      {dirty && <p className="notice warn">Hay cambios sin guardar en el hilo.</p>}
      {over > 0 && <p className="error">{over === 1 ? "Un post supera" : `${over} posts superan`} los {TWEET_MAX} caracteres.</p>}

      {posts.length > 0 && (
        <ol className="thread">
          {posts.map((p, i) => {
            const len = tweetLength(p);
            const pct = Math.min(1, len / TWEET_MAX);
            return (
              <li key={i} className={`tweet ${len > TWEET_MAX ? "over" : ""}`}>
                <div className="tweet-rail" aria-hidden>
                  <span className="tweet-avatar">{i + 1}</span>
                </div>
                <div className="tweet-body">
                  <textarea value={p} onChange={(ev) => edit(i, ev.target.value)} rows={Math.min(9, Math.max(3, Math.ceil(len / 52) + p.split("\n").length - 1))} aria-label={`Post ${i + 1}`} />
                  <div className="tweet-tools">
                    <span className="meter" style={{ ["--p" as string]: pct }} title={`${len} de ${TWEET_MAX}`}>
                      <i />
                    </span>
                    <span className={`count ${len > TWEET_MAX ? "bad" : len > TWEET_MAX - 20 ? "near" : ""}`}>
                      {len}/{TWEET_MAX}
                    </span>
                    <span className="spacer" />
                    <button className="rt-btn" title="Subir" onClick={() => move(i, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button className="rt-btn" title="Bajar" onClick={() => move(i, 1)} disabled={i === posts.length - 1}>
                      ↓
                    </button>
                    <button className="rt-btn" title="Añadir post debajo" onClick={() => addAfter(i)} disabled={posts.length >= THREAD_MAX}>
                      ＋
                    </button>
                    <button className="rt-btn" title="Quitar este post" onClick={() => removePost(i)}>
                      ✕
                    </button>
                    <button className="rt-btn" title="Copiar post" onClick={() => doCopy(i, p)}>
                      {copied === i ? "✓" : "⧉"}
                    </button>
                    <a className="rt-btn" title="Abrir en X con este texto" href={intentUrl(p)} target="_blank" rel="noopener noreferrer">
                      ↗
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
