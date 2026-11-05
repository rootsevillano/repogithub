import { z } from "zod";
import { SLUG } from "./taxonomy";

/**
 * Esquema de una ficha. `type`, `category` y `status` son ids de config/taxonomy.json
 * (se comprueban contra la taxonomía en la API local y en `npm run validate`).
 */
export const TWITTER_STATES = { unpublished: "No publicado", published: "Publicado" } as const;
export const THREAD_MAX = 10;

export const EntrySchema = z.object({
  id: z.string().regex(SLUG, "slug en minúsculas con guiones"),
  type: z.string().regex(SLUG),
  title: z.string().min(1).max(160),
  summary: z.string().max(600),
  body: z.string().optional(),
  /** "text" (por defecto): texto plano con saltos de línea · "html": contenido con formato del editor enriquecido */
  bodyFormat: z.enum(["text", "html"]).optional(),
  url: z.string().url().optional(),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).optional(),
  github: z.object({ owner: z.string(), repo: z.string() }).optional(),
  category: z.string().regex(SLUG),
  subcategory: z.string().optional(),
  tags: z.array(z.string()),
  image: z.string().optional(),
  source: z.object({ file: z.string(), line: z.number().int().optional() }),
  status: z.string().regex(SLUG),
  /** Control de publicación en X (Twitter). Ausente = no publicado. */
  twitter: z.enum(["published", "unpublished"]).optional(),
  /** Hilo para X generado/editado desde la ficha (máx. 10 posts). */
  thread: z.array(z.string().min(1)).max(THREAD_MAX, `máximo ${THREAD_MAX} posts`).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Entry = z.infer<typeof EntrySchema>;
export const EntryListSchema = z.array(EntrySchema);
