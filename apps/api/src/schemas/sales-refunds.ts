import { z } from "zod";

const cents = z.number().int().nonnegative();

export const salesRefundOverviewSchema = z.object({
	orderNo: z.string().trim().min(1),
});

export const salesSquareRefundAllocationSchema = z.object({
	salesOrderId: z.number().int().positive(),
	originalSalesPaymentId: z.number().int().positive().optional().nullable(),
	principalCents: cents,
	cccCents: cents.optional().default(0),
	tipCents: cents.optional().default(0),
});

export const createSalesSquareRefundSchema = z
	.object({
		tenderPaymentId: z.string().min(1),
		principalCents: cents,
		cccCents: cents.optional().default(0),
		tipCents: cents.optional().default(0),
		reason: z.string().trim().min(3).max(192),
		note: z.string().trim().max(2_000).optional().nullable(),
		commercialActionType: z
			.enum(["customer_request", "cancellation", "duplicate_payment"])
			.default("customer_request"),
		commercialActionId: z.string().trim().max(191).optional().nullable(),
		allocations: z.array(salesSquareRefundAllocationSchema).min(1).max(20),
	})
	.superRefine((value, ctx) => {
		if (
			value.commercialActionType === "cancellation" &&
			!value.commercialActionId
		) {
			ctx.addIssue({
				code: "custom",
				path: ["commercialActionId"],
				message:
					"Cancellation refunds require the completed commercial action reference.",
			});
		}
	});

export const allocateExternalSalesSquareRefundSchema = z.object({
	refundId: z.string().min(1),
	allocations: z.array(salesSquareRefundAllocationSchema).min(1).max(20),
});

export const retrySalesSquareRefundSchema = z.object({
	refundId: z.string().min(1),
});

export type CreateSalesSquareRefundInput = z.infer<
	typeof createSalesSquareRefundSchema
>;
