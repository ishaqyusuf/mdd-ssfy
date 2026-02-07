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
