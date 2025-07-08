import { z } from "zod";

export const createInventorySchema = z.object({
  title: z.string(),
  type: z.string(),
  variant: z.object({
    variantTitle: z.string().nullable().optional(),
    img: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
  }),
});

export type CreateInventorySchema = z.infer<typeof createInventorySchema>;
