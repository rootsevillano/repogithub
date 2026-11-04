# TechHub Portal & Wiki

Portal web dinámico y base de conocimiento técnico para la recopilación, categorización y consulta de recursos de desarrollo: repositorios destacados de GitHub, herramientas web, prompts para Inteligencia Artificial y apuntes conceptuales de tecnología.

---

## 📌 Características

- **Feed Dinámico & Vista Wiki:** Organización en formato noticiero/tarjetas con soporte para lectura ágil y filtrado temático.
- **Buscador y Filtros:** Búsqueda en tiempo real por texto, etiquetas (*tags*) y categorías:
  - Repositorios Destacados
  - Divulgación y Aprendizaje
  - Herramientas Web & Utilidades
  - Prompts e Ingeniería de Contexto para IA
  - Conceptos & Apuntes Técnicos
- **Gestión de Contenido:** Panel/mecanismo de edición para actualizar descripciones, enlaces y notas sin modificar el código fuente.
- **Arquitectura Basada en Datos:** Ingesta inicial automatizada a partir de archivos `.txt` e imágenes `.jpeg`, normalizados en esquemas estructurados (`JSON` / Markdown).

---

## 📂 Estructura del Proyecto

```text
repogithub/
├── archivos/              # Fuentes originales .txt/.jpeg (no se suben a git)
├── data/                  # Datos normalizados: un JSON por categoría (fuente de verdad)
├── public/images/         # Imágenes vinculadas a entradas
├── scripts/               # ingest.ts (txt → JSON), curated.ts, validate.ts
├── src/
│   ├── components/        # EntryCard
│   ├── lib/               # Esquema (zod), carga de datos, búsqueda
│   └── views/             # Feed, ficha de detalle, editor
├── vite-plugin-admin.ts   # API de edición local (sólo en dev)
├── MEMORY.md              # Registro de arquitectura, decisiones y estado del proyecto
├── package.json
└── README.md
```

---

## 🚀 Uso

```bash
npm install
npm run dev        # http://127.0.0.1:5173 · incluye el panel de edición local
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor local con edición (botones «+ Nueva» / «✎ Editar»; guarda en `data/*.json`) |
| `npm run ingest` | Reimporta `archivos/*.txt` → `data/*.json` (no toca entradas editadas a mano) |
| `npm run validate` | Valida `data/*.json` contra el esquema |
| `npm run build` | Genera el sitio estático en `dist/` |

**Publicación:** cada push a `main` despliega en GitHub Pages (`.github/workflows/deploy.yml`). Activa *Settings → Pages → Source: GitHub Actions*. En la versión publicada, «Editar en GitHub» abre el JSON correspondiente.

Detalles de arquitectura, esquema y estado: [`MEMORY.md`](MEMORY.md).
