import { z } from "zod";

export const paginationSchema = z.object({
  size: z.number().nullable().optional(),
  sort: z.string().nullable().optional(),
  start: z.number().nullable().optional(),
  q: z.string().nullable().optional(),
});
