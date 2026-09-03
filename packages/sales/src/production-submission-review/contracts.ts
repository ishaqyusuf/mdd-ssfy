import { z } from "zod";

export const productionSubmissionMaterialReviewQueueSchema = z.object({
	status: z
		.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"])
		.default("PENDING"),
	take: z.number().int().min(1).max(100).default(50),
	cursor: z.number().int().positive().optional().nullable(),
	q: z.string().trim().max(120).optional().nullable(),
	salesOrderId: z.number().int().positive().optional().nullable(),
});

export const productionSubmissionMaterialReviewDetailSchema = z.object({
	reviewId: z.number().int().positive(),
});

const receiveInboundReviewSchema = z.object({
	inboundId: z.number().int().positive(),
	receivedAt: z.date().optional().nullable(),
	items: z
		.array(
			z.object({
				inboundShipmentItemId: z.number().int().positive(),
				qtyReceived: z.number().nonnegative().optional().nullable(),
				qtyGood: z.number().nonnegative(),
				qtyIssue: z.number().nonnegative(),
				unitPrice: z.number().nonnegative().optional().nullable(),
				issueType: z
					.enum([
						"damaged",
						"missing",
						"wrong_item",
						"over_received",
						"quality_hold",
					])
					.optional()
					.nullable(),
				issueNotes: z.string().max(2000).optional().nullable(),
			}),
		)
		.min(1),
});

export const decideProductionSubmissionMaterialReviewSchema = z
	.object({
		reviewId: z.number().int().positive(),
		expectedUpdatedAt: z.date(),
		pipelineRevision: z
			.string()
			.regex(/^[a-f0-9]{64}$/)
			.optional(),
		action: z.enum([
			"RECHECK_AND_APPROVE",
			"MARK_AVAILABLE_AND_APPROVE",
			"APPROVE_CONFIGURATION_EXCEPTION",
			"RECEIVE_INBOUND_AND_APPROVE",
			"RESOLVE_AND_APPROVE",
			"REJECT",
		]),
		note: z.string().trim().min(1).max(2000),
		receipt: receiveInboundReviewSchema.optional().nullable(),
		resolutions: z
			.object({
				receipts: z.array(receiveInboundReviewSchema).max(20).default([]),
				markAvailableComponentIds: z
					.array(z.number().int().positive())
					.max(200)
					.default([]),
			})
			.optional()
			.nullable(),
	})
	.superRefine((value, ctx) => {
		if (value.action !== "RESOLVE_AND_APPROVE") return;
		const receiptCount = value.resolutions?.receipts.length || 0;
		const componentCount =
			value.resolutions?.markAvailableComponentIds.length || 0;
		if (!receiptCount && !componentCount) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["resolutions"],
				message: "Select at least one material resolution.",
			});
		}
	});

export type DecideProductionSubmissionMaterialReviewInput = z.infer<
	typeof decideProductionSubmissionMaterialReviewSchema
>;
