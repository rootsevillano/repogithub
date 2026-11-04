import { z } from "zod";

export const CATEGORIES = [
  { id: "repos", name: "Repositorios Destacados", icon: "📦", description: "Proyectos open source de interés general: agentes IA, Claude Code, MCP, vídeo, voz, seguridad…" },
  { id: "aprendizaje", name: "Educación y Aprendizaje", icon: "🎓", description: "Rutas de aprendizaje, cursos, libros y repos para formarse." },
  { id: "herramientas", name: "Herramientas Web", icon: "🧰", description: "Servicios web, apps y utilidades." },
  { id: "prompts", name: "Prompts IA", icon: "💬", description: "Prompts listos para usar con modelos de IA." },
  { id: "conceptos", name: "Conceptos Tech", icon: "🧠", description: "Apuntes y notas sobre servicios y conceptos tecnológicos." },
  { id: "futbol", name: "Fútbol & Sports Analytics", icon: "⚽", description: "Datos, visión computacional y scouting aplicados al fútbol." },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
const categoryIds = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export const ENTRY_TYPES = ["repo", "tool", "prompt", "note", "course"] as const;
export const TYPE_LABELS: Record<(typeof ENTRY_TYPES)[number], string> = {
  repo: "Repositorio",
  tool: "Herramienta",
  prompt: "Prompt",
  note: "Apunte",
  course: "Curso / Recurso",
};

export const EntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "slug en minúsculas con guiones"),
  type: z.enum(ENTRY_TYPES),
  title: z.string().min(1).max(160),
  summary: z.string().max(600),
  body: z.string().optional(),
  url: z.string().url().optional(),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).optional(),
  github: z.object({ owner: z.string(), repo: z.string() }).optional(),
  category: z.enum(categoryIds),
  subcategory: z.string().optional(),
  tags: z.array(z.string()),
  image: z.string().optional(),
  source: z.object({ file: z.string(), line: z.number().int().optional() }),
  status: z.enum(["active", "review", "archived"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Entry = z.infer<typeof EntrySchema>;
export const EntryListSchema = z.array(EntrySchema);
