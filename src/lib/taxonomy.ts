import { z } from "zod";

/**
 * Taxonomía editable (config/taxonomy.json): categorías (+ subcategorías), tipos y estados.
 * Se edita desde /admin/taxonomy en local. Los ids son estables (slugs); nombres, iconos y colores se pueden cambiar.
 */
export const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const slug = z.string().regex(SLUG, "slug en minúsculas con guiones");
const color = z.string().regex(/^#[0-9a-f]{6}$/i, "color hexadecimal #rrggbb");

export const SubcategorySchema = z.object({ id: slug, name: z.string().min(1).max(60) });
export const CategorySchema = z.object({
  id: slug,
  name: z.string().min(1).max(60),
  icon: z.string().max(16),
  description: z.string().max(300),
  /** Hashtags (sin #) que se añaden a los hilos de X de esta categoría. */
  hashtags: z.array(z.string().regex(/^[\p{L}\p{N}_]+$/u, "hashtag sin espacios ni #")),
  subcategories: z.array(SubcategorySchema),
});
export const TypeSchema = z.object({ id: slug, label: z.string().min(1).max(40), icon: z.string().max(16), color });
export const StatusSchema = z.object({
  id: slug,
  label: z.string().min(1).max(40),
  color,
  /** Se muestra en el feed y cuenta en los contadores. */
  visible: z.boolean(),
  /** Se marca con un distintivo en tarjetas y fichas. */
  flag: z.boolean(),
});

function uniqueIds(list: { id: string }[], ctx: z.RefinementCtx, where: string) {
  const seen = new Set<string>();
  for (const x of list) {
    if (seen.has(x.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${where}: id duplicado «${x.id}»` });
    seen.add(x.id);
  }
}

export const TaxonomySchema = z
  .object({
    categories: z.array(CategorySchema).min(1, "debe haber al menos una categoría"),
    types: z.array(TypeSchema).min(1, "debe haber al menos un tipo"),
    statuses: z.array(StatusSchema).min(1, "debe haber al menos un estado"),
  })
  .superRefine((t, ctx) => {
    uniqueIds(t.categories, ctx, "categorías");
    uniqueIds(t.types, ctx, "tipos");
    uniqueIds(t.statuses, ctx, "estados");
    for (const c of t.categories) uniqueIds(c.subcategories, ctx, `subcategorías de ${c.id}`);
    if (!t.statuses.some((s) => s.visible)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "al menos un estado debe ser visible" });
  });

export type Taxonomy = z.infer<typeof TaxonomySchema>;
export type Category = Taxonomy["categories"][number];
export type EntryType = Taxonomy["types"][number];
export type Status = Taxonomy["statuses"][number];

/** Reasignaciones al borrar elementos en uso: id antiguo → id nuevo ("" = quitar subcategoría). */
export type Remap = {
  types?: Record<string, string>;
  statuses?: Record<string, string>;
  categories?: Record<string, string>;
  /** clave "categoria/sub" → "" o id de otra subcategoría de la misma categoría */
  subcategories?: Record<string, string>;
};
