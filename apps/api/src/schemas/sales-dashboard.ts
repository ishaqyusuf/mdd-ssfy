
import { z } from "zod";

export const salesDashboardFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
