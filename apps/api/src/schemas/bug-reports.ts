import { z } from "zod";

export const BUG_REPORT_STATUSES = [
  "NEW",
  "IN_REVIEW",
  "IN_PROGRESS",
  "NEEDS_INFO",
  "FIXED",
  "CLOSED",
] as const;

export const BUG_REPORT_MAX_DURATION_MS = 90_000;
export const BUG_REPORT_MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

export const bugReportStatusSchema = z.enum(BUG_REPORT_STATUSES);

export const bugReportUploadSchema = z.object({
  url: z.string().url(),
  pathname: z.string().min(1).max(512),
  contentType: z.string().min(1).max(255).optional().nullable(),
  size: z.number().int().positive().max(BUG_REPORT_MAX_UPLOAD_SIZE_BYTES),
  filename: z.string().max(255).optional().nullable(),
});

export const createBugReportSchema = z.object({
  description: z.string().max(5000).optional().nullable(),
  currentUrl: z.string().max(2048).optional().nullable(),
  userAgent: z.string().max(2000).optional().nullable(),
  durationMs: z.number().int().min(1).max(BUG_REPORT_MAX_DURATION_MS),
  microphoneEnabled: z.boolean().default(false),
  upload: bugReportUploadSchema,
});

export const bugReportIdSchema = z.object({
  id: z.string().min(1),
});

export const listBugReportsSchema = z
  .object({
    status: bugReportStatusSchema.optional(),
  })
  .optional();

export const addBugReportFollowUpSchema = z.object({
  bugReportId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
});

export const updateBugReportStatusSchema = z.object({
  bugReportId: z.string().min(1),
  status: bugReportStatusSchema,
});

