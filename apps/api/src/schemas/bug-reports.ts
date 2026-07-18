import { z } from "zod";

export const BUG_REPORT_STATUSES = [
	"NEW",
	"IN_REVIEW",
	"IN_PROGRESS",
	"NEEDS_INFO",
	"FIXED",
	"CLOSED",
] as const;

export const BUG_REPORT_CAPTURE_TYPES = ["VIDEO", "SCREENSHOT"] as const;
export const BUG_REPORT_TRANSCRIPTION_STATUSES = [
	"NOT_REQUESTED",
	"PENDING",
	"COMPLETED",
	"FAILED",
] as const;

export const BUG_REPORT_MAX_DURATION_MS = 90_000;
export const BUG_REPORT_MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;
export const BUG_REPORT_MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;
export const BUG_REPORT_MAX_AUDIO_DURATION_MS = 10 * 60_000;

export const bugReportStatusSchema = z.enum(BUG_REPORT_STATUSES);
export const bugReportCaptureTypeSchema = z.enum(BUG_REPORT_CAPTURE_TYPES);
export const bugReportTranscriptionStatusSchema = z.enum(
	BUG_REPORT_TRANSCRIPTION_STATUSES,
);

export const bugReportUploadSchema = z.object({
	url: z.string().url(),
	pathname: z.string().min(1).max(512),
	contentType: z.string().min(1).max(255).optional().nullable(),
	size: z.number().int().positive().max(BUG_REPORT_MAX_UPLOAD_SIZE_BYTES),
	filename: z.string().max(255).optional().nullable(),
});

export const bugReportAudioUploadSchema = bugReportUploadSchema.extend({
	size: z.number().int().positive().max(BUG_REPORT_MAX_AUDIO_SIZE_BYTES),
});

export const bugReportAudioEvidenceSchema = z.object({
	upload: bugReportAudioUploadSchema,
	durationMs: z
		.number()
		.int()
		.min(1)
		.max(BUG_REPORT_MAX_AUDIO_DURATION_MS)
		.optional()
		.nullable(),
	transcriptionStatus: bugReportTranscriptionStatusSchema
		.default("PENDING")
		.optional(),
	transcriptionText: z.string().max(10_000).optional().nullable(),
	transcriptionProvider: z.string().max(100).optional().nullable(),
});

export const createBugReportSchema = z.object({
	captureType: bugReportCaptureTypeSchema.default("VIDEO"),
	description: z.string().max(5000).optional().nullable(),
	currentUrl: z.string().max(2048).optional().nullable(),
	userAgent: z.string().max(2000).optional().nullable(),
	durationMs: z
		.number()
		.int()
		.min(1)
		.max(BUG_REPORT_MAX_DURATION_MS)
		.optional()
		.nullable(),
	microphoneEnabled: z.boolean().default(false),
	upload: bugReportUploadSchema,
	audio: bugReportAudioEvidenceSchema.optional().nullable(),
});

export const bugReportIdSchema = z.object({
	id: z.string().min(1),
});

export const transcribeBugReportFollowUpSchema = z.object({
	followUpId: z.string().min(1),
});

export const listBugReportsSchema = z
	.object({
		status: bugReportStatusSchema.optional(),
	})
	.optional();

export const addBugReportFollowUpSchema = z.object({
	bugReportId: z.string().min(1),
	body: z.string().trim().min(1).max(5000),
	audio: bugReportAudioEvidenceSchema.optional().nullable(),
});

export const updateBugReportStatusSchema = z.object({
	bugReportId: z.string().min(1),
	status: bugReportStatusSchema,
});
