import { z } from "zod";

export const saveSupplierSchema = z.object({
  name: z.string(),
  id: z.number().optional().nullable(),
});

export type SaveSupplierSchema = z.infer<typeof saveSupplierSchema>;
