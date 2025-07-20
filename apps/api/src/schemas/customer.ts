import { z } from "zod";

export const searchCustomersSchema = z.object({
  query: z.string().optional(),
});

export type SearchCustomersSchema = z.infer<typeof searchCustomersSchema>;
