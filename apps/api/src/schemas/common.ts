import { z } from "zod";

export const paginationSchema = z.object({
  size: z.number().nullable().optional(),
  sort: z.string().nullable().optional(),
  // start: z.number().nullable().optional(),
  cursor: z.string().nullable().optional(),
  q: z.string().nullable().optional(),
});
export const idSchema = z.object({
  id: z.number(),
});
export type IdSchema = z.infer<typeof idSchema>;
export const idsSchema = z.object({
  ids: z.array(z.number()).min(1),
});
export type IdsSchema = z.infer<typeof idsSchema>;
