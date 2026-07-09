import { z } from "zod";

export const SALES_EMAIL_ATTEMPT_STATUSES = [
	"QUEUED",
	"SENDING",
	"SENT",
	"FAILED",
	"SKIPPED",
] as const;

export const salesEmailAttemptStatusSchema = z.enum(
	SALES_EMAIL_ATTEMPT_STATUSES,
);

export const listSalesEmailAttemptsSchema = z
	.object({
		status: salesEmailAttemptStatusSchema.optional(),
		q: z.string().trim().max(255).optional(),
		salesRepId: z.number().int().positive().optional(),
		from: z.coerce.date().optional(),
		to: z.coerce.date().optional(),
		page: z.number().int().min(1).default(1),
		size: z.number().int().min(1).max(100).default(25),
	})
	.optional();

export const resendSalesEmailAttemptSchema = z.object({
	attemptId: z.string().min(1),
});

export type ListSalesEmailAttemptsInput = z.infer<
	typeof listSalesEmailAttemptsSchema
>;
export type ResendSalesEmailAttemptInput = z.infer<
	typeof resendSalesEmailAttemptSchema
>;
