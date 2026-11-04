/**
 * Entradas curadas a mano a partir de las imágenes de archivos/:
 *  - calude_code_resource_bible.jpeg → public/images/claude-code-resource-bible.jpeg
 *  - ingenieria_inversa.jpeg         → public/images/ingenieria-inversa-prompt.jpeg
 */
import type { Entry } from "../src/lib/schema.ts";

const BIBLE_IMG = "images/claude-code-resource-bible.jpeg";
const RE_IMG = "images/ingenieria-inversa-prompt.jpeg";
const BIBLE_SRC = "calude_code_resource_bible.jpeg";

// [nº, nombre, descripción, url, sección]
const BIBLE: [number, string, string, string, string][] = [
  [1, "Claude Code Docs", "Documentación oficial completa de Claude Code.", "https://code.claude.com/docs", "Official Anthropic"],
  [2, "Claude Partner Network", "Red de partners de Anthropic.", "https://anthropic.com/news/claude-partner-network", "Official Anthropic"],
  [3, "Claude Certified Architect", "Certificación oficial de arquitecto de Claude.", "https://anthropic.skilljar.com/claude-certified-architect-foundation-access-request", "Official Anthropic"],
  [4, "MCP Servers (oficial)", "Repositorio oficial de servidores MCP.", "https://github.com/modelcontextprotocol/servers", "Official Anthropic"],
  [5, "Everything Claude Code", "Directorio curado de herramientas para Claude Code.", "https://ecc.tools", "Directorios y mega listas"],
  [6, "everything-claude-code", "Mega colección de recursos de Claude Code en GitHub.", "https://github.com/affaan-m/everything-claude-code", "Directorios y mega listas"],
  [7, "Awesome MCP Servers", "Lista de servidores MCP (2K+ estrellas).", "https://github.com/punkpeye/awesome-mcp-servers", "Directorios y mega listas"],
  [8, "Awesome Claude Skills", "Lista de skills para Claude.", "https://github.com/Beh1Secc/awesome-claude-skills", "Directorios y mega listas"],
  [9, "Skill Codex", "Directorio comunitario de skills.", "https://github.com/skills-directory/skill-codex", "Directorios y mega listas"],
  [10, "Visual Skills Browser", "Explorador visual de skills.", "https://cmux-artemzhutov.netlify.app/skills.html", "Directorios y mega listas"],
  [11, "50+ Best MCP Addons", "Lista curada de extensiones MCP.", "https://claudefa.st/blog/tools/mcp-extensions/best-addons", "Directorios y mega listas"],
  [12, "MCP Server Guide", "Guía de los mejores servidores MCP para Claude Code.", "https://mcp.cat.io/guides/best-mcp-servers-for-claude-code", "Directorios y mega listas"],
  [13, "Playwright MCP", "Automatización de navegador (oficial).", "https://github.com/anthropics/mcp-server-playwright", "MCP Servers"],
  [14, "Firecrawl MCP", "Scraping web y búsqueda vía MCP.", "https://github.com/micholasoxford/firecrawl-mcp", "MCP Servers"],
  [15, "Supabase MCP", "Base de datos, auth y edge functions.", "https://github.com/supabase-community/supabase-mcp", "MCP Servers"],
  [16, "PostgreSQL MCP", "Acceso a bases de datos PostgreSQL.", "https://github.com/micholasoxford/postgres-mcp", "MCP Servers"],
  [17, "GitHub MCP", "PRs, issues y repositorios.", "https://github.com/micholasoxford/github-mcp", "MCP Servers"],
  [18, "Sentry MCP", "Monitorización de errores.", "https://github.com/micholasoxford/sentry-mcp", "MCP Servers"],
  [19, "Dokploy MCP", "Despliegues.", "https://github.com/Dokploy/mcp", "MCP Servers"],
  [21, "Slack MCP", "Mensajería.", "https://github.com/micholasoxford/slack-mcp", "MCP Servers"],
  [22, "Notion MCP", "Base de conocimiento.", "https://github.com/micholasoxford/notion-mcp", "MCP Servers"],
  [23, "Figma MCP", "Acceso a diseños.", "https://github.com/micholasoxford/figma-mcp", "MCP Servers"],
  [24, "Linear MCP", "Gestión de proyectos.", "https://github.com/micholasoxford/linear-mcp", "MCP Servers"],
  [25, "10 CLI Tools for AI Coding", "Artículo de Starmorph sobre herramientas CLI para programar con IA.", "https://blog.starmorph.com/blog/10-cli-tools-for-ai-coding", "Artículos y blogs"],
  [26, "Best MCP Servers for Devs", "Artículo de Firecrawl sobre los mejores servidores MCP.", "https://firecrawl.dev/blog/best-mcp-servers-for-developers", "Artículos y blogs"],
  [27, "MCP Config Guide", "Guía paso a paso para configurar MCP en Claude Code.", "https://builder.io/blog/claude-code-mcp-servers", "Artículos y blogs"],
  [28, "Agentmaxxing", "Agentes en paralelo.", "https://substack.com/@blog/agentmaxxing", "Artículos y blogs"],
  [29, "Superpowers", "Herramientas de navegador + LinkedIn.", "https://github.com/ohra/superpowers", "Skills y extensiones"],
  [30, "Taste Skill", "Skill anti-«slop» para frontend.", "https://github.com/Leonx1nx/taste-skill", "Skills y extensiones"],
  [31, "Chrome CDP Skill", "Controla pestañas de Chrome.", "https://github.com/pasky/chrome-cdp-skill", "Skills y extensiones"],
  [32, "Delivery Lifecycle", "Skills de flujo de trabajo completo.", "https://github.com/levnikolaevich/claude-code-skills", "Skills y extensiones"],
  [33, "Codex Settings", "Configuraciones optimizadas.", "https://github.com/fcakyon/claude-codex-settings", "Skills y extensiones"],
  [34, "CLUI", "Interfaz visual para Claude Code.", "https://github.com/lcoutodemos/clui-cc", "Skills y extensiones"],
  [35, "Loop", "Ejecutor de tareas recurrentes.", "https://github.com/tadaspetra/loop", "Skills y extensiones"],
  [36, "Clawd Cursor", "Claude + Cursor.", "https://github.com/AmrDab/clawd-cursor", "Skills y extensiones"],
  [37, "cmux", "Terminal de agentes para macOS (7.7K estrellas).", "https://cmux.com", "Multiplexores de terminal"],
  [38, "gmux", "Orquestación multi-agente.", "https://gmux.sh", "Multiplexores de terminal"],
  [39, "claude-squad", "Gestiona múltiples agentes.", "https://github.com/smtg-ai/claude-squad", "Multiplexores de terminal"],
  [40, "dmux", "Multiplexor de git worktrees.", "https://github.com/standardagents/dmux", "Multiplexores de terminal"],
  [41, "mux", "Desarrollo paralelo aislado.", "https://github.com/coder/mux", "Multiplexores de terminal"],
  [42, "ClawTeam", "Coordinación multi-agente.", "https://github.com/HKUDS/ClawTeam", "Frameworks de agentes"],
  [43, "CLI-Anything", "Convierte cualquier herramienta en CLI.", "https://github.com/HKUDS/CLI-Anything", "Frameworks de agentes"],
  [44, "Collaborator AI", "Colaboración multi-agente.", "https://github.com/collaborator-ai/collab-public", "Frameworks de agentes"],
  [45, "Autoresearch", "Bucles de investigación automatizada.", "https://github.com/udtiaoenka/autoresearch", "Frameworks de agentes"],
  [46, "ACE Platform", "Entorno de control de agentes.", "https://github.com/DannyMac180/ace-platform", "Frameworks de agentes"],
  [47, "Hermes Agent", "Agente de NousResearch.", "https://github.com/NousResearch/hermes-agent", "Frameworks de agentes"],
  [48, "CopilotKit", "Integra copilotos en tus apps.", "https://github.com/CopilotKit/CopilotKit", "Frameworks de agentes"],
  [49, "n8n-as-code", "Workflows de n8n como código.", "https://github.com/EtienneLescot/n8n-as-code", "Automatización e infraestructura"],
  [50, "Office Agents", "Automatización de Word + Excel.", "https://github.com/newl1yang/office-agents", "Automatización e infraestructura"],
  [51, "Cloak Browser", "Navegador sigiloso para agentes.", "https://github.com/CloakHQ/CloakBrowser", "Automatización e infraestructura"],
  [52, "OpenLogs", "Observabilidad de agentes IA.", "https://openlogs.dev", "Automatización e infraestructura"],
  [53, "Vercel Chat SDK", "Agentes para tus usuarios.", "https://vercel.com/blog/chat-sdk-brings-agents-to-your-users", "Automatización e infraestructura"],
  [54, "Self-Hosted Infra", "Guía de autoalojamiento de Happy Engineering.", "https://happy.engineering/docs/guides/self-hosting", "Automatización e infraestructura"],
];

const SECTION_TAGS: Record<string, string[]> = {
  "Official Anthropic": ["oficial"],
  "Directorios y mega listas": ["awesome-list"],
  "MCP Servers": ["mcp"],
  "Artículos y blogs": ["articulo"],
  "Skills y extensiones": ["skills"],
  "Multiplexores de terminal": ["terminal", "agentes"],
  "Frameworks de agentes": ["agentes"],
  "Automatización e infraestructura": ["automatizacion"],
};

function ghOf(url: string) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  return m ? { owner: m[1], repo: m[2] } : undefined;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const RE_PROMPT = `<prompt>
<role>
Analista experto en ingeniería inversa con IA: análisis de binarios, arquitectura de aplicaciones, observación en tiempo de ejecución e ingeniería de producto. Tiene acceso a REA (Reverse Engineer Anything) vía MCP para inspeccionar binarios nativos, apps JavaScript/Electron, ensamblados .NET, APKs de Android y webs, y puede escribir y probar código. Basado en evidencias, escéptico con las suposiciones.
</role>

<objective>
Elegir una app objetivo (herramienta de escritorio, app Electron, web, APK) y una funcionalidad. Trazar cómo funciona hasta el nivel de código con REA, separar comportamiento probado de suposiciones y reconstruir una versión limpia y original de esa funcionalidad para tu propio proyecto, con tests que demuestren que se comporta igual.
</objective>

<context>
- REA MCP server (npx rea-agents setup; funciona con Claude Code, Codex, Cursor)
- Análisis nativo con Hopper, Ghidra o IDA
- Inspección estática de apps JavaScript/Electron y ensamblados .NET
- Observación de navegador y capturas de red (HAR)
- Entorno de programación para implementar y probar la reconstrucción
</context>

<research_process>
1. Target Scoping — definir app, funcionalidad y qué significa "reconstruir"
2. Setup & Readiness — instalar REA y elegir el proveedor adecuado
3. Surface Mapping — módulos, imports, símbolos, strings, rutas e IPC
4. Feature Tracing — seguir la funcionalidad desde el disparador de UI hasta la lógica
5. Evidence Collection — pseudocódigo, referencias, rutas de fichero, llamadas de red
6. Reconstruction — escribir código limpio y original a partir de lo encontrado
7. Verification — probar tu versión contra la original con casos reales
8. Final Report — cómo funciona, qué está probado y qué sigue siendo desconocido
</research_process>

<analysis_requirements>
Por cada funcionalidad: explicación en una línea, cadena de llamadas completa (fichero, función, dirección), evidencia de cada afirmación, etiqueta de confianza (probado / probable / supuesto), formatos de datos y llamadas de red, casos límite y manejo de errores, e implementación limpia y comentada.
</analysis_requirements>

<guardrails>
- Propiedad, autorización y licencias
- Nunca saltarse licencias, DRM, autenticación o paywalls
- No extraer secretos, claves ni datos de usuarios
- El pseudocódigo puede estar mal: verificar antes de confiar
- Interoperabilidad sí; clonar un producto no
</guardrails>

<output_format>
1. Executive Summary  2. Target Profile  3. Feature Trace  4. Evidence Log
5. Reconstruction  6. Verification Results  7. Build Plan  8. Unknowns & Limits
</output_format>

<rules>
- Analiza solo software propio o para el que tengas autorización.
- Nunca afirmes cómo funciona algo sin evidencia de REA.
- Separa hechos de interpretaciones y etiqueta las suposiciones.
- Escribe código original; la salida decompilada es solo referencia.
- Sé honesto con las limitaciones y lo desconocido.
</rules>

<starter_prompt>
"Understand how [feature] works in [App], show me the evidence, and build a similar feature for my project."
Instalar: npx rea-agents setup · Actualizar: npx rea-agents@latest setup
</starter_prompt>
</prompt>`;

export function curatedEntries(now: string): Entry[] {
  const hub: Entry = {
    id: "claude-code-resource-bible",
    type: "course",
    title: "Claude Code Resource Bible",
    summary: "Infografía con 54 herramientas, repos y tutoriales sobre Claude Code en 8 secciones: oficial, directorios, MCP, artículos, skills, multiplexores, frameworks de agentes y automatización.",
    body:
      "Guía de inicio: «Beginner → Advanced Guide» (charliehills.substack.com).\n\nSecciones:\n" +
      Object.keys(SECTION_TAGS)
        .map((s) => `• ${s}: ${BIBLE.filter((b) => b[4] === s).map((b) => b[1]).join(", ")}`)
        .join("\n"),
    url: "https://charliehills.substack.com/p/claude-code-beginner-advanced",
    category: "repos",
    subcategory: "claude-code",
    tags: ["claude-code", "mcp", "awesome-list", "infografia"],
    image: BIBLE_IMG,
    source: { file: BIBLE_SRC },
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const items: Entry[] = BIBLE.map(([n, name, desc, url, section]) => {
    const gh = ghOf(url);
    const isArticle = section === "Artículos y blogs" || section === "Official Anthropic";
    return {
      id: gh ? `gh-${slug(`${gh.owner}-${gh.repo}`)}` : `ccbible-${String(n).padStart(2, "0")}-${slug(name)}`,
      type: gh ? "repo" : isArticle ? "course" : "tool",
      title: name,
      summary: desc,
      body: `Recurso nº ${n} de la «Claude Code Resource Bible» · sección ${section}.`,
      url,
      github: gh,
      category: "repos",
      subcategory: section === "MCP Servers" ? "mcp" : section === "Frameworks de agentes" || section === "Multiplexores de terminal" ? "agentes-ia" : "claude-code",
      tags: ["claude-code", ...SECTION_TAGS[section]],
      image: BIBLE_IMG,
      source: { file: BIBLE_SRC },
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
  });

  const re: Entry = {
    id: "prompt-ingenieria-inversa-rea",
    type: "prompt",
    title: "Prompt de ingeniería inversa con REA (Reverse Engineer Anything)",
    summary: "Prompt estructurado en XML para que un agente analice una funcionalidad de una app (binario, Electron, .NET, APK o web) con REA vía MCP, recoja evidencias y la reconstruya con código original y tests.",
    body: RE_PROMPT,
    url: "https://rea.tools",
    category: "prompts",
    subcategory: "desarrollo",
    tags: ["ingenieria-inversa", "mcp", "agentes", "claude-code", "seguridad"],
    image: RE_IMG,
    source: { file: "ingenieria_inversa.jpeg" },
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  return [hub, ...items, re];
}
