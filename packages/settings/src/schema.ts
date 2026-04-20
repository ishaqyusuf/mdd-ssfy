import { z } from "zod";

export const settingsSchema = z.object({
  id: z.number().optional(),
  type: z.enum([
    "sales-settings",
    "install-price-chart",
    "app-download-apk",
    "jobs-settings",
    "unit-invoice-sweeper-settings",
    "task-events-settings",
  ]),
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
export const appDownloadSettings = settingsSchema.omit({ meta: true }).extend({
  meta: z.object({
    fileName: z.string().nullable().optional(),
    version: z.string().nullable().optional(),
    downloadUrl: z.string().nullable().optional(),
    publicId: z.string().nullable().optional(),
    assetId: z.string().nullable().optional(),
    uploadedAt: z.string().nullable().optional(),
    uploadedBy: z
      .object({
        id: z.number().nullable().optional(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    notes: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
    reminderSentAt: z.string().nullable().optional(),
    reminderSentForExpiry: z.string().nullable().optional(),
  }),
});
export type AppDownloadSettings = z.infer<typeof appDownloadSettings>;
export type JobsSettings = z.infer<typeof jobsSettings>;
export const unitInvoiceSweeperSettings = settingsSchema.extend({
  meta: z.object({
    lastStartedAt: z.string().nullable().optional(),
    lastCompletedAt: z.string().nullable().optional(),
    running: z.boolean().default(false),
    lastRunSummary: z
      .object({
        homeId: z.number().nullable().optional(),
        reason: z.string().nullable().optional(),
        scannedUnits: z.number().default(0),
        cleanedUnits: z.number().default(0),
        deletedTaskCount: z.number().default(0),
        updatedBuilderTaskCount: z.number().default(0),
        skippedPaidDuplicateGroups: z.number().default(0),
        startedAt: z.string().nullable().optional(),
        completedAt: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  }),
});
export type UnitInvoiceSweeperSettings = z.infer<
  typeof unitInvoiceSweeperSettings
>;
export const taskEventsSettings = settingsSchema.extend({
  meta: z.object({
    events: z
      .record(
        z.string(),
        z.object({
          status: z.enum(["active", "inactive"]).default("active"),
          filter: z.record(z.string(), z.any()).default({}),
        }),
      )
      .default({}),
  }),
});
export type TaskEventsSettings = z.infer<typeof taskEventsSettings>;

export type SettingsTypes = {
  // "sales-settings": SettingsSchema;
  "install-price-chart": InstallCostSettings;
  "app-download-apk": AppDownloadSettings;
  "jobs-settings": JobsSettings;
  "unit-invoice-sweeper-settings": UnitInvoiceSweeperSettings;
  "task-events-settings": TaskEventsSettings;
  "sales-settings": SettingsSchema;
};
