Actúa como un arquitecto de software y desarrollador full-stack senior. Vamos a construir una aplicación web dinámica dentro del directorio actual (`C:\Github\repogithub`), la cual se desplegará posteriormente en GitHub.

### 1. Contexto y Fuentes de Datos
En la ruta `C:\Github\repogithub\archivos` dispones de varios archivos `.txt` e imágenes `.jpeg`. 
Estos archivos contienen:
- Repositorios de GitHub de interés general con sus descripciones y enlaces.
- Repositorios especializados por temáticas concretas.
- Repositorios enfocados a la divulgación, aprendizaje y adquisición de conocimientos.
- Apuntes y notas sobre conceptos de tecnología.
- Recursos adicionales como herramientas web y prompts para IA.

### 2. Fase de Ingesta y Estructuración de Datos
Antes de escribir la interfaz:
1. Inspecciona y lee detalladamente todos los archivos `.txt` e imágenes `.jpeg` en `C:\Github\repogithub\archivos`.
2. Analiza, extrae y categoriza semánticamente toda la información identificada (ej. `Repositorios Destacados`, `Educación y Aprendizaje`, `Conceptos Tech`, `Prompts IA`, `Herramientas Web`).
3. Normaliza esta información en un formato de datos limpio y estructurado (por ejemplo, archivos JSON modulares o Markdown con frontmatter dentro de un directorio `/data` o `/content`) que sirva como base de datos inicial para la web. Las imágenes `.jpeg` deben quedar vinculadas a sus respectivas entradas y almacenadas en el directorio público de assets.

### 3. Requisitos de la Aplicación Web
- **Diseño y Formato:** Estilo portal dinámico/noticiero técnico o wiki moderna, con un feed visualmente atractivo, filtros por categorías, buscador de texto rápido y tarjetas de contenido claras (con enlaces directos, tags y vista previa).
- **Contenido Vivo y Editable:** La plataforma debe permitir actualizar o corregir fácilmente cualquier elemento (descripciones, enlaces, tags o noticias). Implementa un mecanismo claro para la edición (por ejemplo: un panel de edición visual/formulario local protegido que actualice el almacenamiento de datos, o una arquitectura desacoplada basada en archivos JSON/Markdown editables con sincronización reactiva en tiempo real).
- **Stack Técnico Recomendado:** Elige un stack ágil y ligero (ej. Vite + React / Astro / Next.js) que permita tanto la visualización reactiva como una futura integración con GitHub Pages o un servidor local/Vercel.

### 4. Directiva de Memoria (`MEMORY.md`)
- Crea y mantén actualizado un archivo `MEMORY.md` en la raíz del repositorio (`C:\Github\repogithub\MEMORY.md`).
- Documenta en él:
  - Resumen del análisis de los archivos leídos y la taxonomía de categorías establecida.
  - Decisiones de arquitectura técnica y stack seleccionado.
  - Esquema de datos utilizado para el contenido dinámico.
  - Registro de cambios, estado del proyecto y próximos pasos a seguir.

### 5. Plan de Acción
Procede paso a paso:
1. Inspecciona la carpeta `archivos/` y muéstrame un resumen de las categorías y volumen de información detectado.
2. Propón la estructura de datos normalizada y la arquitectura técnica.
3. Inicializa el archivo `MEMORY.md` con este punto de partida antes de generar el código.