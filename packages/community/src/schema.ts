import z from "zod";

export const builderFormSchema = z.object({
  id: z.number().optional().nullable(),
  name: z.string(),
  address: z.string().optional().nullable(),
  tasks: z.array(
    z.object({
      id: z.number().optional().nullable(),
      builderId: z.number().optional().nullable(),
      taskName: z.string(),
      billable: z.boolean().optional().nullable(),
      productionable: z.boolean().optional().nullable(),
      addonPercentage: z.number().optional().nullable(),
      installable: z.boolean().optional().nullable(),
    }),
  ),
});
export type BuilderFormSchema = z.infer<typeof builderFormSchema>;

export const communityInstallCostRateSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string(),
  unit: z.string().optional().nullable(),
  unitCost: z.number(),
  status: z.enum(["active", "inactive"]).default("active"),
});
export type CommunityInstallCostRateSchema = z.infer<
  typeof communityInstallCostRateSchema
>;

export const jobFormShema = z.object({
  unit: z
    .object({
      id: z.number(),
      // lot: z.string(),
      // block: z.string(),
      // modelName: z.string(),
      // modelNo: z.string(),
      // projectTitle: z.string(),
    })
    .optional(),
  user: z
    .object({
      id: z.number(),
      // name: z.string(),
    })
    .optional(),
  job: z.object({
    id: z.number().optional(),
    description: z.string().optional(),
    isCustom: z.boolean().optional().default(false).nullable(),
    adminNote: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    subtitle: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    tasks: z
      .array(
        z.object({
          id: z.number().optional().nullable(),
          modelTaskId: z.number(),
          rate: z.number().optional().nullable(),
          qty: z.number().optional().nullable(),
          maxQty: z.number().optional().nullable(),
        }),
      )
      .optional(),
    meta: z.object({
      addon: z.number().optional().nullable(),
      additionalCostReason: z.string().optional().nullable(),
      additional_cost: z.number().optional().nullable(),
    }),
  }),
});
export type JobFormSchema = z.infer<typeof jobFormShema>;
