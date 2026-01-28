import { z } from "zod";

export const settingsSchema = z.object({
  id: z.number().optional(),
  type: z.enum(["sales-settings", "install-price-chart", "jobs-settings"]),
  meta: z.record(z.any(), z.any()).default({}),
});
export type SettingsSchema = z.infer<typeof settingsSchema>;
export const jobsSettings = settingsSchema.extend({
  meta: {
    allowCustomJobs: z.boolean().default(false),
    showTaskQty: z.boolean().default(false),
  },
});
export type JobsSettings = z.infer<typeof jobsSettings>;

export type SettingsTypes = {
  // "sales-settings": SettingsSchema;
  "install-price-chart": SettingsSchema;
  "jobs-settings": JobsSettings;
  "sales-settings": SettingsSchema;
};
