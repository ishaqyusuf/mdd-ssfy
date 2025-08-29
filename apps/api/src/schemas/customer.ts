import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const searchCustomersSchema = z.object({
  query: z.string().optional(),
});

export type SearchCustomersSchema = z.infer<typeof searchCustomersSchema>;

export const getCustomersSchema = z.object({}).merge(paginationSchema);
export type GetCustomers = z.infer<typeof getCustomersSchema>;
