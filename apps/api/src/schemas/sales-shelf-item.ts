import { z } from "zod";

export const shelfItemStatusSchema = z
  .enum(["all", "active", "disabled"])
  .default("active");

export const listShelfProductsSchema = z.object({
  query: z.string().trim().max(100).default(""),
  categoryId: z.number().int().positive().optional().nullable(),
  status: shelfItemStatusSchema,
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
});
export type ListShelfProductsSchema = z.infer<typeof listShelfProductsSchema>;

export const listShelfCategoriesSchema = z.object({});
export type ListShelfCategoriesSchema = z.infer<
  typeof listShelfCategoriesSchema
>;

export const shelfProductFormSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(255),
  unitPrice: z.number().finite().min(0).optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  parentCategoryId: z.number().int().positive().optional().nullable(),
  img: z.string().trim().max(1000).optional().nullable(),
  enabled: z.boolean().default(true),
});
export type ShelfProductFormSchema = z.infer<typeof shelfProductFormSchema>;

export const updateShelfProductSchema = shelfProductFormSchema.extend({
  id: z.number().int().positive(),
});
export type UpdateShelfProductSchema = z.infer<typeof updateShelfProductSchema>;

export const toggleShelfProductSchema = z.object({
  id: z.number().int().positive(),
  enabled: z.boolean(),
});
export type ToggleShelfProductSchema = z.infer<typeof toggleShelfProductSchema>;

export const toggleShelfCategorySchema = z.object({
  id: z.number().int().positive(),
  enabled: z.boolean(),
});
export type ToggleShelfCategorySchema = z.infer<
  typeof toggleShelfCategorySchema
>;
