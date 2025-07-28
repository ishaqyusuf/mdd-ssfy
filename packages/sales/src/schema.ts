import { z } from "zod";
export const getFullSalesDataSchema = z.object({
  salesId: z.number().optional().nullable(),
  salesNo: z.string().optional().nullable(),
  assignedToId: z.number().optional().nullable(),
});
export type GetFullSalesDataSchema = z.infer<typeof getFullSalesDataSchema>;
