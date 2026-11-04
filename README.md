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
├── archivos/              # Archivos de origen (.txt, .jpeg)
├── public/                # Recursos estáticos e imágenes procesadas
├── src/
│   ├── assets/            # Estilos y recursos gráficos
│   ├── components/        # Componentes de UI (Cards, Feed, Search, Editor)
│   ├── data/              # Datos normalizados (JSON / Content Collections)
│   └── views/             # Vistas de la aplicación
├── MEMORY.md              # Registro de arquitectura, decisiones y estado del proyecto
├── package.json
└── README.md