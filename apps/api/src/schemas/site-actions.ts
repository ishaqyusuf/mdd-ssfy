import { z } from "zod";

export const siteActionsFilterSchema = z.object({});

export type SiteActionFilterParams = z.infer<typeof siteActionsFilterSchema>;
