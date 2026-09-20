import { z } from "zod";

// Browser-safe contracts only. Authorization and validation of account ownership
// remain responsibilities of the GND server in later tickets.
export const sourceKindSchema = z.enum(["FACEBOOK_PAGE_BROWSER", "MARKETPLACE_BROWSER"]);
export const sendModeSchema = z.enum(["off", "draft_only", "whatsapp_approved"]);
export const jobStateSchema = z.enum([
  "queued", "leased", "prepared", "submitting", "sent_confirmed",
  "send_unknown", "failed", "cancelled", "stale",
]);

export const connectionSummarySchema = z.object({
  id: z.string().min(1),
  sourceKind: sourceKindSchema,
  externalAccountId: z.string().min(1),
  sendMode: sendModeSchema,
  configRevision: z.number().int().nonnegative(),
});

export const approvedJobSchema = z.object({
  jobId: z.string().min(1),
  connectionId: z.string().min(1),
  externalThreadKey: z.string().min(1),
  expectedContextRevision: z.number().int().nonnegative(),
  approvedText: z.string().min(1).max(10_000),
  approvedTextHash: z.string().min(1),
  leaseFence: z.number().int().nonnegative(),
});

export type ConnectionSummary = z.infer<typeof connectionSummarySchema>;
export type ApprovedJob = z.infer<typeof approvedJobSchema>;
export type SourceKind = z.infer<typeof sourceKindSchema>;
export type SendMode = z.infer<typeof sendModeSchema>;
export type JobState = z.infer<typeof jobStateSchema>;
