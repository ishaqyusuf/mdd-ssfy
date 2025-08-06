import { z } from "zod";
import { paginationSchema } from "./common";

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

export const communityTemplateQueryParamsSchema = z
  .object({
    // example: z.string(),
    _q: z.string().optional().nullable(),
    builderId: z.number().optional().nullable(),
    projectId: z.number().optional().nullable(),
  })
  .merge(paginationSchema);
export type CommunityTemplateQueryParams = z.infer<
  typeof communityTemplateQueryParamsSchema
>;
