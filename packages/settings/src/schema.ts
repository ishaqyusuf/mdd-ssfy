import { z } from "zod";

export const settingsSchema = z.object({
  id: z.number().optional(),
  type: z.enum(["sales-settings", "install-price-chart", "jobs-settings"]),
  meta: z.record(z.any(), z.any()).default({}),
});
export type SettingsSchema = z.infer<typeof settingsSchema>;
export const jobsSettings = settingsSchema.extend({
  meta: z.object({
    allowCustomJobs: z.boolean().default(false),
    showTaskQty: z.boolean().default(false),
  }),
});
export const installCostSettings = settingsSchema.omit({ meta: true }).extend({
  meta: z.object({
    list: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          cost: z.number(),
          defaultQty: z.number().default(1),
          contractor: z.boolean().default(false),
          punchout: z.boolean().default(false),
          uid: z.string().optional(),
        }),
      )
      .default([]),
  }),
});
export type InstallCostSettings = z.infer<typeof installCostSettings>;
export type JobsSettings = z.infer<typeof jobsSettings>;

export type SettingsTypes = {
  // "sales-settings": SettingsSchema;
  "install-price-chart": InstallCostSettings;
  "jobs-settings": JobsSettings;
  "sales-settings": SettingsSchema;
};
