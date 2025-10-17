import { z } from "zod";

export const customerServiceSchema = z.object({
  projectName: z.string(),
  lot: z.string(),
  block: z.string(),
});
