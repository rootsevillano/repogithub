# MEMORY.md — TechHub Portal & Wiki

Registro vivo de análisis, decisiones de arquitectura, esquema de datos y estado del proyecto.
Última actualización: 2026-11-04

---

## 0. Notas de entorno

- **Ruta real del repo:** `C:\DevLocal\repogithub` (el brief `INICIO.md` menciona `C:\Github\repogithub`; se usa la ruta real).
- `.gitignore` excluye `archivos/` → las fuentes en bruto **no** se suben a GitHub; sólo se versionan los datos normalizados (`/data`) y las imágenes copiadas a `public/`.
- `AGENTE.md` está borrado en el árbol de trabajo; `INICIO.md` sin versionar.

---

## 1. Análisis de las fuentes (`archivos/`)

Contenido copiado de redes sociales (hilos de X/LinkedIn): texto libre, emojis, numeraciones irregulares (`1.`, `**`, `*****`, `-1.`), enlaces sueltos o acortados (`lnkd.in`). No hay formato homogéneo → la ingesta requiere parser heurístico + curación semántica.

| Archivo | Tamaño | Bloques* | Con enlace | Contenido |
|---|---|---|---|---|
| `Repositorios.txt` | 130 KB / 3053 líneas | ~824 | ~346 (294 repos GitHub únicos) | Repos generalistas: agentes IA, Claude Code, MCP, vídeo, voz, seguridad, self-hosting, dev tools |
| `Herramientas.txt` | 51 KB / 957 líneas | ~134 | ~101 (75 repos) | Herramientas web/SaaS, listas por sector, apps self-hosted (*arr stack*), seguridad |
| `Prompts.txt` | 53 KB / 636 líneas | ~118 | 2 | Packs de prompts (contenido, marketing, estudio, ChatGPT/NotebookLM) |
| `Apuntes Tecnologia.txt` | 37 KB / 903 líneas | ~122 | ~40 (24 repos) | Notas sobre servicios (CodeWiki, DeepWiki, NotebookLM…), conceptos, prompts embebidos |
| `Repositorios de conocimientos.txt` | 15 KB / 364 líneas | ~86 | ~38 (43 repos) | Rutas de aprendizaje (Data Science, ML, IA…), cursos, libros |
| `Repositorios Scraping o futbol.txt` | 8.5 KB | ~35 | ~29 (14 repos) | Scraping (Firecrawl, Scrapling, PixelRAG) + datos de fútbol |
| `Apuntes Futbol.txt` | 5 KB | ~16 | ~6 | Hilos sobre scouting/análisis táctico |
| `Repositorios futbol directos de github.txt` | 1.3 KB | ~10 | 7 (10 repos) | Búsquedas `topic:` de GitHub + repos de football analytics |
| `SoloVideo.txt` | 2.3 KB | 7 | 7 | Repos de generación/edición de vídeo con IA |
| `SoloAudio.txt` | 186 B | 1 | 4 | Repos de TTS / clonación de voz |
| `calude_code_resource_bible.jpeg` | 400 KB | — | 54 enlaces | Infografía "Claude Code Resource Bible": 54 recursos en 8 secciones (Official, Directories, MCP Servers, Articles, Skills, Terminal Multiplexers, Agent Frameworks, Automation) |
| `ingenieria_inversa.jpeg` | 1 MB | — | — | Prompt estructurado (XML) de ingeniería inversa con REA |

\*Bloque = párrafo separado por líneas en blanco (estimación; una entrada puede ocupar varios bloques).

**Volumen estimado tras deduplicar:** ~450–550 entradas (≈400 repos únicos, ~100 herramientas web, ~120 prompts, ~60 apuntes).

**Dominios más frecuentes:** github.com (570), lnkd.in (58, acortados → resolver o marcar), x.com (31), youtube.com (36), arxiv.org (7).

**Incidencias detectadas:**
- `Herramientas.txt` tiene **codificación mixta/corrupta** (mojibake tipo `esc¨¢ner`, `se?ora`): requiere reparación de texto en la ingesta + revisión manual.
- Nombre de imagen con errata: `calude_code_…` → se renombrará a `claude-code-resource-bible.jpeg` en `public/`.
- Duplicados entre ficheros (mismo repo en varios .txt) → deduplicar por URL normalizada y fusionar tags.
- Textos con tono "clickbait" (🚨, "GRATIS") → el `summary` se reescribe neutro; el texto original se conserva en `body`.

---

## 2. Taxonomía de categorías

| `category` (slug) | Nombre | Subcategorías (`subcategory`) | Fuente principal |
|---|---|---|---|
| `repos` | Repositorios Destacados | `agentes-ia`, `claude-code`, `mcp`, `video`, `audio-voz`, `scraping`, `seguridad`, `self-hosted`, `dev-tools`, `diseno` | Repositorios.txt, SoloVideo, SoloAudio, Scraping, imagen bible |
| `aprendizaje` | Educación y Aprendizaje | `data-science`, `machine-learning`, `programacion`, `ciberseguridad`, `cursos-libros` | Repositorios de conocimientos.txt |
| `herramientas` | Herramientas Web | `ia`, `productividad`, `diseno`, `seguridad`, `multimedia`, `self-hosted` | Herramientas.txt |
| `prompts` | Prompts IA | `contenido`, `marketing`, `estudio`, `desarrollo`, `analisis` | Prompts.txt, Apuntes Tecnologia (embebidos), imagen ingeniería inversa |
| `conceptos` | Conceptos Tech | `servicios-ia`, `arquitectura`, `buenas-practicas` | Apuntes Tecnologia.txt |
| `futbol` | Fútbol & Sports Analytics | `datos`, `vision-computacional`, `scouting` | Apuntes Futbol, Repos futbol, Scraping o futbol |

Los **tags** son transversales (ej. `claude-code`, `mcp`, `python`, `open-source`, `gratis`, `self-hosted`, `llm`).

**Desde 2026-11-05 la taxonomía es editable** y vive en `config/taxonomy.json` (la tabla anterior es el estado inicial). Se gestiona en local desde `#/admin/taxonomy`:
- **Categorías**: id, nombre, icono, descripción, hashtags para hilos de X y lista de **subcategorías** (id + nombre). Cada categoría = `data/<id>.json`.
- **Tipos**: id, etiqueta, icono, color (distintivos y franja de las tarjetas). Iniciales: repo, tool, prompt, note, course.
- **Estados**: id, etiqueta, color, `visible` (sale en feed/contadores) y `flag` (distintivo en tarjeta). Iniciales: active (visible), review (visible + distintivo), archived (oculto).
- Los ids no se renombran una vez guardados (las fichas los referencian); nombre/icono/color/orden sí. Borrar un elemento en uso obliga a **reasignar** sus fichas (la API reescribe los JSON afectados).

---

## 3. Arquitectura técnica (implementada)

**Stack:** Vite 6 + React 18 + TypeScript, React Router (HashRouter → compatible con GitHub Pages sin rewrites), MiniSearch, zod. Sin backend en producción: sitio estático (`base: "./"`).

- **Datos:** JSON por categoría en `data/<category>.json` (fuente de verdad, versionada). Se cargan con `import.meta.glob` (`src/lib/data.ts`), así que cualquier cambio en disco recarga el feed en `npm run dev`.
- **Búsqueda:** índice MiniSearch en cliente (`src/lib/search.ts`): prefijo + fuzzy, sin acentos, pesos título 4 > tags 3 > repo 2 > resumen 1.5 > cuerpo. Atajo `/` para enfocar.
- **UI (rediseño 2026-11-05):** tipografía Inter + JetBrains Mono, marca con logotipo, menú lateral por secciones (Explorar / Categorías / Administración), hero con estadísticas, tarjetas con franja de color del tipo y toda la tarjeta clicable, distintivos tintados con el color de la taxonomía (adaptados a modo oscuro con `color-mix`), formularios en tarjeta. Feed de tarjetas (avatar del owner de GitHub o favicon, badge de tipo con color, tags clicables, enlace directo), barra lateral por categoría con contadores, filtros por subcategoría / tipo / tag, orden (recientes, A–Z, orden original, relevancia), selector de estado (por defecto, los estados visibles), paginación "Ver más", ficha detalle tipo wiki (texto original con enlaces, imagen OG de GitHub, enlaces extra, "Copiar prompt", relacionados), tema claro/oscuro (sistema + toggle), responsive (menú lateral deslizante < 860 px).
- **Edición (contenido vivo):**
  - *Local*: `vite-plugin-admin.ts` añade `PUT /api/entries` y `DELETE /api/entries/:id` **sólo en `vite serve`** (`apply: "serve"`). Escribe en `data/*.json`, valida con zod, gestiona cambios de categoría/id y rechaza ids duplicados. Protección: servidor en 127.0.0.1 + rechazo de peticiones con `Origin` ajeno (anti-CSRF). UI: botón "+ Nueva" y "✎ Editar" → `#/admin/new`, `#/admin/edit/:id`.
  - *Editor enriquecido* (`src/components/RichEditor.tsx`, TipTap 2): negrita, cursiva, subrayado, tachado, código, resaltado, 6 colores de texto, título/subtítulo/bloque de código, alineación izquierda/centro/derecha/**justificado**, listas, cita, separador, enlaces, deshacer/rehacer y "quitar formato". Se carga con `React.lazy` sólo al abrir `/admin` (≈77 kB gzip aparte del bundle principal).
  - El contenido con formato se guarda como HTML en `body` con `bodyFormat: "html"`. Las entradas de texto plano (ingesta) se convierten a HTML al abrirlas en el editor (`textToHtml`) y pasan a `html` al guardar.
  - Seguridad: el HTML se sanea con DOMPurify (`src/lib/html.ts`) al guardar y al mostrar: lista blanca de etiquetas, sólo enlaces http/https/mailto, `style` limitado a `text-align`, `color` y `background-color`.
  - *Taxonomía*: `PUT /api/taxonomy {taxonomy, remap}` valida con zod, aplica reasignaciones (tipos, estados, categorías —mueve fichas de fichero—, subcategorías), rechaza (409) si quedan fichas apuntando a elementos borrados, crea `data/<cat>.json` vacío para categorías nuevas y elimina el de las borradas.
  - *Hilos de X* (`src/lib/twitter.ts`, `src/components/ThreadPanel.tsx`, sólo en dev): botón «🧵 Generar hilo» en la ficha → hilo de ≤10 posts (gancho con título+resumen y 🧵👇, puntos clave del contenido con emojis, post del repo/enlace, enlaces extra, cierre con CTA y hashtags de tags + categoría + #IA/#OpenSource/#GitHub según contenido). Contador ponderado como twitter-text v3: emoji = 2, CJK = 2, URL = 23, latinos y hashtags = 1 por carácter. Cada post se edita, reordena, añade/quita, copia o abre en el compositor de X; «Guardar hilo» lo persiste en `thread`, «Borrar hilo» lo elimina. Combo **Twitter** (Publicado / No publicado) en la ficha y en el editor; filtro «𝕏» en el feed y distintivo en tarjetas (sólo local).
  - *Publicado*: sólo lectura; "✎ Editar en GitHub" abre `data/<category>.json` en el editor web de GitHub → commit → el workflow redepliega.
- **Ingesta:** `npm run ingest` (`scripts/ingest.ts`):
  - Decodifica línea a línea UTF-8 → GB18030 → Windows-1252 (`Herramientas.txt` tenía mezcla GB18030 + CP1252; los emojis originales ya se habían perdido como `??`).
  - Divide en posts (≥2 líneas en blanco). Ficheros "links": segmenta por líneas numeradas (`1.`, `1)`, `9/`, `**`, `*****`) o por grupos de URL; ficheros "notes" (Apuntes, Prompts): una entrada por post.
  - Clasifica por reglas de palabras clave (subcategoría + tags); contenido de fútbol se mueve a `futbol`; apuntes con muchos prompts → `prompts`.
  - Deduplica por `owner/repo` o URL; si la primera aparición no tenía descripción, adopta la de la siguiente.
  - Entradas curadas a mano desde las imágenes: `scripts/curated.ts`.
  - **Idempotente y respetuosa**: no sobrescribe entradas con `updatedAt ≠ createdAt` (editadas) ni con `source.file === "manual"` (creadas en el panel).
- **Validación:** `npm run validate` (taxonomía + esquema + ids únicos + categoría coherente con el fichero + tipo/estado/categoría/subcategoría existentes en la taxonomía). La ingesta registra automáticamente en la taxonomía las subcategorías nuevas que generen sus reglas. Se ejecuta en CI antes del build.
- **Despliegue:** `.github/workflows/deploy.yml` → GitHub Pages en cada push a `main` (requiere activar *Settings → Pages → Source: GitHub Actions*). URL esperada: https://rootsevillano.github.io/repogithub/
- **Imágenes:** `public/images/claude-code-resource-bible.jpeg` (renombrada, errata "calude"), `public/images/ingenieria-inversa-prompt.jpeg`.

```text
repogithub/
├── archivos/                 # fuentes en bruto (gitignored)
├── config/taxonomy.json      # categorías+subcategorías, tipos, estados (editable)
├── data/*.json               # un fichero por categoría
├── public/images/
├── scripts/ingest.ts | curated.ts | validate.ts | taxonomy-node.ts
├── src/
│   ├── lib/        schema.ts · taxonomy.ts · data.ts · search.ts · html.ts · twitter.ts
│   ├── components/ EntryCard.tsx · Badges.tsx · RichEditor.tsx · ThreadPanel.tsx
│   ├── views/      Feed.tsx · EntryView.tsx · Editor.tsx · TaxonomyAdmin.tsx
│   ├── App.tsx · main.tsx · styles.css
├── vite-plugin-admin.ts · vite.config.ts
└── .github/workflows/deploy.yml
```

---

## 4. Esquema de datos (`src/lib/schema.ts`)

```ts
type Entry = {
  id: string;              // slug: "gh-<owner>-<repo>" para repos; "<type>-<slug>-<hash>" resto
  type: string;            // id de config/taxonomy.json → types
  title: string;
  summary: string;         // ≤600, se muestra en la tarjeta
  body?: string;           // texto original / prompt completo
  bodyFormat?: "text" | "html"; // text (defecto): texto plano con enlaces autodetectados · html: editor enriquecido (saneado)
  url?: string;
  links?: { label: string; url: string }[];
  github?: { owner: string; repo: string };
  category: string;        // id de taxonomy → categories (= fichero data/<id>.json)
  subcategory?: string;    // id de taxonomy → categories[].subcategories
  tags: string[];
  image?: string;          // ruta relativa a public/, ej. "images/x.jpeg"
  source: { file: string; line?: number };   // "manual" si se creó en el panel
  status: string;          // id de taxonomy → statuses (visible / flag)
  twitter?: "published" | "unpublished";     // control de publicación en X; ausente = no publicado
  thread?: string[];       // hilo de X guardado (≤10 posts)
  createdAt: string;       // ISO
  updatedAt: string;       // ISO; ≠ createdAt ⇒ editada a mano (la ingesta no la toca)
};
```

**Volumen tras la ingesta inicial:** 612 entradas — repos 364 · aprendizaje 99 · herramientas 82 · conceptos 33 · prompts 18 · fútbol 16. 80 en estado `review` (sin descripción en la fuente, enlaces `lnkd.in` o posts de X sin texto).

---

## 5. Registro de cambios

- **2026-11-04** — Inspección de `archivos/` (10 .txt + 2 .jpeg), taxonomía y arquitectura propuestas, `MEMORY.md` inicializado.
- **2026-11-04** — Propuesta aprobada. Implementado: scaffold Vite/React/TS, esquema zod, ingesta con reparación de codificación, 612 entradas en `/data`, 54 recursos + prompt extraídos de las imágenes, feed/buscador/filtros/detalle, panel de edición local, validación y workflow de GitHub Pages. Verificado en navegador: búsqueda, ficha, edición → escritura en JSON → recarga, re-ingesta conserva la edición, layout móvil sin scroll horizontal. Commit 5f27836 en main.
- **2026-11-04** — GitHub Pages activado (build_type: workflow). Despliegue OK: https://rootsevillano.github.io/repogithub/ (verificado en navegador, modo sólo lectura).

- **2026-11-05** — Taxonomía editable (`config/taxonomy.json` + `#/admin/taxonomy` + `PUT /api/taxonomy` con reasignación), campo `twitter` (Publicado/No publicado), generador/editor de hilos de X guardados en `thread`, rediseño visual. Verificado en navegador: hilo de Podcastfy (10 posts ≤280), guardar → JSON, cambiar estado de X, borrar hilo; borrar tipo `course` reasignando 107 fichas a `note` → validate OK (datos restaurados después); móvil sin scroll horizontal; build OK.
- **2026-11-05** — Editor de texto enriquecido para el contenido de las fichas (formato, alineación/justificado, colores, listas, enlaces), campo `bodyFormat`, render HTML saneado, búsqueda y "Copiar prompt" sobre texto plano extraído del HTML, editor cargado bajo demanda. Verificado en navegador (guardar → ficha con centrado, color, negrita+subrayado y justificado; scripts/onerror/javascript: eliminados; prompt XML en texto plano se abre literal).

## 6. Estado y próximos pasos

**Estado:** MVP publicado en https://rootsevillano.github.io/repogithub/ · edición local con `npm run dev`.

1. (Hecho) Commit + push y GitHub Pages activado.
2. Curar las 80 entradas `review` (selector «Estado: Pendiente de revisión» en el feed): añadir descripciones, resolver `lnkd.in`.
3. Reescribir en tono neutro los títulos tipo clickbait de `prompts`/`conceptos` (p. ej. "ÚLTIMA HORA: …").
4. Opcional: dividir los packs de prompts en prompts individuales copiables.
5. Opcional: enriquecer repos con estrellas/lenguaje vía API de GitHub en un script (`scripts/enrich.ts`), cacheado en el JSON.
6. Ingesta: algunos enlaces de origen vienen truncados con «…» (p. ej. `github.com/souzatharsis/p…` → repo «p»); detectarlos y marcarlos `review`.
7. Opcional: code-splitting de `/data` por categoría si el bundle crece (hoy ≈210 kB gzip).
8. Opcional: generación de hilos con un LLM (hoy es por plantillas/heurística, sin API externa).
