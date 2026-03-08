import z from "zod";
import { JOB_STATUS_OPTIONS } from "./constants";

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

export const jobFormSchema = z
  .object({
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
        id: z.number().optional().nullable(),
        // name: z.string(),
      })
      .optional(),
    builderTaskId: z.number().optional(),
    modelInstallTaskId: z.number().optional(),
    requestTaskConfig: z.boolean().optional(),
    job: z.object({
      id: z.number().optional(),
      amount: z.number().optional().nullable(),
      description: z.string().optional(),
      isCustom: z.boolean().optional().default(false).nullable(),
      adminNote: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
      subtitle: z.string().optional().nullable(),
      // type: z.string(),
      status: z
        .enum([...JOB_STATUS_OPTIONS])
        .optional()
        .nullable(),

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
      meta: z
        .object({
          addon: z.number().optional().nullable(),
          addonPercent: z.number().optional().nullable(),
          additionalCostReason: z.string().optional().nullable(),
          additional_cost: z.number().optional().nullable(),
        })
        .optional()
        .nullable(),
    }),
    adminMode: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.job.isCustom) {
      // if (!data.job.meta.additional_cost)
      //   ctx.addIssue({
      //     code: "custom",
      //     message: "Additional cost is required for custom jobs",
      //     path: ["job.meta.additional_cost"],
      //   });
      // if (!data.job?.description)
      //   ctx.addIssue({
      //     code: "custom",
      //     message: "Description is required for custom jobs",
      //     path: ["job.description"],
      //   });
    }
  });
export type JobFormSchema = z.infer<typeof jobFormSchema>;

// Backward-compat alias; prefer jobFormSchema.
export const jobFormShema = jobFormSchema;
