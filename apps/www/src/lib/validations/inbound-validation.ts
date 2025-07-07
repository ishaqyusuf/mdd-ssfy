import { z } from "zod";

export const inboundFormSchema = z.object({
  status: z.string(),
  refrence: z.string().optional(),
  supplier: z.string().optional(),

  meta: z.object({}).optional(),
});
