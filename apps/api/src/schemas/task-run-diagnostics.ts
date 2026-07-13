import { z } from "zod";

export const taskRunDiagnosticStatusSchema = z.enum([
	"RUNNING",
	"SUCCEEDED",
	"FAILED",
	"CANCELED",
	"STALE",
	"START_FAILED",
]);

export const taskRunDiagnosticMetadataSchema = z
	.object({
		taskName: z.string().nullish(),
		type: z.string().nullish(),
		entityId: z.union([z.string(), z.number()]).nullish(),
		entityLabel: z.string().nullish(),
	})
	.catchall(z.unknown())
	.optional();

export const registerTaskRunDiagnosticSchema = z.object({
	runId: z.string().min(1),
	taskName: z.string().min(1),
	title: z.string().optional(),
	description: z.string().optional(),
	source: z.string().optional(),
	environment: z.string().optional(),
	metadata: taskRunDiagnosticMetadataSchema,
	startedAt: z.coerce.date().optional(),
});

export const recordTaskRunStartFailureSchema = z.object({
	taskName: z.string().min(1),
	title: z.string().optional(),
	description: z.string().optional(),
	source: z.string().optional(),
	environment: z.string().optional(),
	errorMessage: z.string().optional(),
	errorName: z.string().optional(),
	metadata: taskRunDiagnosticMetadataSchema,
});

export const finalizeTaskRunDiagnosticSchema = z.object({
	runId: z.string().min(1),
	observedStatus: z.enum(["COMPLETED", "FAILED", "CANCELED"]).optional(),
	errorMessage: z.string().optional(),
	metadata: taskRunDiagnosticMetadataSchema,
	finishedAt: z.coerce.date().optional(),
});

export const listTaskRunDiagnosticsSchema = z.object({
	page: z.number().int().min(1).optional(),
	size: z.number().int().min(1).max(100).optional(),
	status: taskRunDiagnosticStatusSchema.optional(),
	taskName: z.string().optional(),
	q: z.string().optional(),
	entityType: z.string().optional(),
	entityId: z.string().optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
});

export const getTaskRunDiagnosticSchema = z.object({
	id: z.string().min(1),
});

export const markTaskRunDiagnosticReviewedSchema = z.object({
	id: z.string().min(1),
});
