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

export const updateInstallCostSchema = z.object({
  communityModelId: z.number(),
  pivotId: z.number().optional().nullable(),
  meta: z.object({
    pivot: z.any().optional().nullable(),
    communityModel: z.any().optional().nullable(),
  }),
});
export type UpdateInstallCostSchema = z.infer<typeof updateInstallCostSchema>;

export const communityModelCostFormSchema = z.object({
  id: z.number(),
});
export type CommunityModelCostForm = z.infer<
  typeof communityModelCostFormSchema
>;

export const saveCommunityModelCostSchema = z.object({
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  id: z.number().optional().nullable(),
  communityModelId: z.number(),
  pivotId: z.number().optional().nullable(),
  costs: z.record(z.string(), z.any().optional().nullable()),
  tax: z.record(z.string(), z.any().optional().nullable()),
  meta: z.any().optional().nullable(),
  model: z.string(),
});
export type SaveCommunityModelCost = z.infer<
  typeof saveCommunityModelCostSchema
>;

const communityTemplateQueryParamsSchema = z
  .object({
    // example: z.string(),
    _q: z.string().optional().nullable(),
    builderId: z.number().optional().nullable(),
    projectId: z.number().optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type CommunityTemplateQueryParams = z.infer<
  typeof communityTemplateQueryParamsSchema
>;
