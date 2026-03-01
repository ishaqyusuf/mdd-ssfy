import z from "zod";

const worker = z
  .object({
    id: z.number().optional().nullable(),
    name: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

export const createJobSchema = z
  .object({
    id: z.number().optional().nullable(),
    description: z.string().optional().nullable(),
    title: z.string(),
    subtitle: z.string().optional().nullable(),
    controlId: z.string().optional().nullable(),
    isCustom: z.boolean().optional().nullable(),
    mode: z.enum(["assign", "submit"]).optional().nullable(),
    type: z
      .enum(["punchout", "installation", "Deco-Shutter"])
      .optional()
      .nullable(),
    status: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    date: z.date().optional().nullable(),
    projectId: z.number().optional().nullable(),
    coWorkerJobId: z.number().optional().nullable(),
    homeId: z.number().optional().nullable(),
    additionalCost: z.number().optional().nullable(),
    includeAdditionalCharges: z.boolean().optional().nullable(),
    additionalReason: z.string().optional().nullable(),
    addon: z.number().optional().nullable(),
    worker,
    coWorker: worker,
    tasks: z.record(
      z.string(),
      z.object({
        qty: z.number().optional().nullable(),
        maxQty: z.number().optional().nullable(),
        cost: z.number(),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (data?.isCustom && !data?.description)
      ctx.addIssue({
        message: "Description is required",
        path: ["description"],
        code: "custom",
      });
    if (data?.isCustom && !data?.additionalCost)
      ctx.addIssue({
        message: "Amount required",
        path: ["additionalCost"],
        code: "custom",
      });
    if (!data?.isCustom && data.mode != "assign") {
      Object.entries(data?.tasks).map(([k, data]) => {
        if (data.qty && !data.maxQty) {
          ctx.addIssue({
            message: "qty cannot be greater than maxQty",
            path: [`tasks.${k}.qty`],
            code: "custom",
          });
        }
        if (data.qty && data.maxQty && data.qty > data.maxQty)
          ctx.addIssue({
            message: "qty cannot be greater than maxQty",
            path: [`tasks.${k}.qty`],
            code: "custom",
          });
      });
    }
  });

export type CreateJobSchema = z.infer<typeof createJobSchema>;
