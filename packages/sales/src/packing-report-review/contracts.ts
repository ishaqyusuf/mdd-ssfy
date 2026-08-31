import { z } from "zod";

const packingQuantitySchema = z
	.object({
		qty: z.number().int().nonnegative().default(0),
		lhQty: z.number().int().nonnegative().default(0),
		rhQty: z.number().int().nonnegative().default(0),
	})
	.superRefine((value, ctx) => {
		if (value.qty > 0 && (value.lhQty > 0 || value.rhQty > 0)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Use either single quantity or LH/RH quantities.",
			});
		}
		if (value.qty + value.lhQty + value.rhQty <= 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Physically verified quantity must be greater than zero.",
			});
		}
	});

export const packingReportContextSchema = z.object({
	dispatchId: z.number().int().positive(),
});

export const submitPackingReportSchema = packingQuantitySchema
	.extend({
		dispatchId: z.number().int().positive(),
		productionSubmissionId: z.number().int().positive().optional().nullable(),
		salesItemControlUid: z
			.string()
			.trim()
			.min(1)
			.max(191)
			.optional()
			.nullable(),
		dispatchAllocationKey: z.string().trim().min(1).max(64),
		manifestRevision: z.string().trim().min(1).max(64),
		idempotencyKey: z.string().trim().min(8).max(128),
		physicallyVerified: z.literal(true),
		note: z.string().trim().max(2_000).optional().nullable(),
	})
	.superRefine((value, ctx) => {
		if (!value.productionSubmissionId && !value.salesItemControlUid) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "A production submission or sales item control is required.",
			});
		}
	});

export const decidePackingReportSchema = z.object({
	reportId: z.number().int().positive(),
	expectedUpdatedAt: z.date(),
	action: z.enum(["APPROVE", "REJECT"]),
	note: z.string().trim().min(1).max(2_000),
});

export const decidePackingReportsSchema = z
	.object({
		reports: z
			.array(
				z.object({
					reportId: z.number().int().positive(),
					expectedUpdatedAt: z.date(),
				}),
			)
			.min(1)
			.max(100),
		action: z.enum(["APPROVE", "REJECT"]),
		note: z.string().trim().min(1).max(2_000),
	})
	.superRefine((value, ctx) => {
		const reportIds = value.reports.map((report) => report.reportId);
		if (new Set(reportIds).size !== reportIds.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["reports"],
				message: "A packing report may only appear once in a review batch.",
			});
		}
	});

export type SubmitPackingReportInput = z.infer<
	typeof submitPackingReportSchema
>;
export type DecidePackingReportInput = z.infer<
	typeof decidePackingReportSchema
>;
export type DecidePackingReportsInput = z.infer<
	typeof decidePackingReportsSchema
>;
