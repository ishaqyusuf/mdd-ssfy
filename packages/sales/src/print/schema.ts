import { z } from "zod";

export const printSalesV2Schema = z.object({
  ids: z.array(z.number()).min(1),
  mode: z.enum(["invoice", "quote", "production", "packing-slip", "order-packing"]),
  dispatchId: z.number().optional().nullable(),
});

export type PrintSalesV2Input = z.infer<typeof printSalesV2Schema>;
