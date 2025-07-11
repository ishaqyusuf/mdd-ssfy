import { inboundFilterStatus } from "@gnd/utils/constants";
import { z } from "zod";

export const globalSearchSchema = z.object({
  searchTerm: z.string().nullable().optional(),
});
export type GlobalSearchSchema = z.infer<typeof globalSearchSchema>;
