import { z } from "zod";

export const siteActionsFilterSchema = z.object({
  q: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  cursor: z.string().optional().nullable(),
  size: z.coerce.number().optional().nullable(),
  sort: z.array(z.string()).optional().nullable(),
});

export type SiteActionFilterParams = z.infer<typeof siteActionsFilterSchema>;
