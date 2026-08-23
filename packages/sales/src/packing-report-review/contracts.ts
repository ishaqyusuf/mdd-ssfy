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

export const submitPackingReportSchema = packingQuantitySchema.extend({
	dispatchId: z.number().int().positive(),
	productionSubmissionId: z.number().int().positive(),
	dispatchAllocationKey: z.string().trim().min(1).max(64),
	manifestRevision: z.string().trim().min(1).max(64),
	idempotencyKey: z.string().trim().min(8).max(128),
	physicallyVerified: z.literal(true),
	note: z.string().trim().max(2_000).optional().nullable(),
});

export const decidePackingReportSchema = z.object({
	reportId: z.number().int().positive(),
	expectedUpdatedAt: z.date(),
	action: z.enum(["APPROVE", "REJECT"]),
	note: z.string().trim().min(1).max(2_000),
});

export type SubmitPackingReportInput = z.infer<
	typeof submitPackingReportSchema
>;
export type DecidePackingReportInput = z.infer<
	typeof decidePackingReportSchema
>;
