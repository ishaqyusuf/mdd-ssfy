import { z } from "zod";

export const communityTemplateFormSchema = z.object({
  id: z.number().optional().nullable(),
  projectId: z.number(),
  modelName: z.string(),
});
export type CommunityTemplateForm = z.infer<typeof communityTemplateFormSchema>;
