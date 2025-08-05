import { z } from "zod";

export const communityTemplateFormSchema = z.object({
  id: z.number().optional().nullable(),
  projectId: z.number(),
  projectName: z.string().optional().nullable(),
  modelName: z.string().min(1),
  oldModelName: z.string().nullable().optional(),
});
export type CommunityTemplateForm = z.infer<typeof communityTemplateFormSchema>;

export const createCommunityModelCostSchema = z.object({
  builderId: z.number(),
  modelName: z.string(),
  builderName: z.string().optional().nullable(),
});
export type CreateCommunityModelCost = z.infer<
  typeof createCommunityModelCostSchema
>;
