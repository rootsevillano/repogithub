import { Suspense, lazy, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CATEGORIES } from "./lib/schema";
import { ENTRIES, IS_DEV } from "./lib/data";
import Feed from "./views/Feed";
import EntryView from "./views/EntryView";
// El editor (TipTap) se carga bajo demanda: la web publicada no lo descarga salvo que se abra /admin.
const Editor = lazy(() => import("./views/Editor"));

function useTheme() {
  const [theme, setTheme] = useState<string | null>(() => {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    try {
      if (theme) localStorage.setItem("theme", theme);
      else localStorage.removeItem("theme");
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);
  const dark = theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  return { dark, toggle: () => setTheme(dark ? "light" : "dark") };
}

function SearchBox() {
  const [params] = useSearchParams();
  const loc = useLocation();
  const nav = useNavigate();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const submit = (value: string) => {
    const onFeed = loc.pathname === "/" || loc.pathname.startsWith("/c/");
    const next = new URLSearchParams(onFeed ? params : undefined);
    if (value) next.set("q", value);
    else next.delete("q");
    nav({ pathname: onFeed ? loc.pathname : "/", search: next.toString() }, { replace: onFeed });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.getElementById("search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form className="search" role="search" onSubmit={(e) => (e.preventDefault(), submit(q))}>
      <span aria-hidden>⌕</span>
      <input
        id="search"
        type="search"
        placeholder="Buscar repos, herramientas, prompts…  ( / )"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          submit(e.target.value);
        }}
        autoComplete="off"
      />
    </form>
  );
}

export default function App() {
  const { dark, toggle } = useTheme();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, ENTRIES.filter((e) => e.category === c.id && e.status !== "archived").length]));

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn menu-btn" onClick={() => setMenu(!menu)} aria-label="Menú">
          ☰
        </button>
        <Link to="/" className="brand">
          <span className="brand-mark">◆</span> TechHub
        </Link>
        <SearchBox />
        <div className="top-actions">
          {IS_DEV && (
            <Link to="/admin/new" className="btn btn-primary">
              + Nueva
            </Link>
          )}
          <button className="icon-btn" onClick={toggle} aria-label="Cambiar tema" title="Cambiar tema">
            {dark ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <nav>
          <NavLink to="/" end className="nav-item">
            <span>🗞️</span> Todo <em>{Object.values(counts).reduce((a, b) => a + b, 0)}</em>
          </NavLink>
          {CATEGORIES.map((c) => (
            <NavLink key={c.id} to={`/c/${c.id}`} className="nav-item">
              <span>{c.icon}</span> {c.name} <em>{counts[c.id]}</em>
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-foot">
          {IS_DEV ? "Modo edición local activo: los cambios se guardan en /data." : "Sólo lectura. Para editar, usa «Editar en GitHub» o ejecuta el proyecto en local."}
        </p>
      </aside>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}

      <main className="content">
        <Suspense fallback={<p className="empty">Cargando…</p>}>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/c/:cat" element={<Feed />} />
          <Route path="/e/:id" element={<EntryView />} />
          <Route path="/admin/new" element={<Editor />} />
          <Route path="/admin/edit/:id" element={<Editor />} />
          <Route path="*" element={<p className="empty">Página no encontrada. <Link to="/">Volver al inicio</Link></p>} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}
