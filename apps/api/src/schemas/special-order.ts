import { z } from "zod";

export const specialOrderRequestSchema = z.object({
	salesId: z.number().int().positive(),
});

export const specialOrderEnrollmentSchema = specialOrderRequestSchema.extend({
	reason: z.preprocess(
		(value) =>
			typeof value === "string" && value.trim() === "" ? null : value,
		z.string().trim().min(3).max(500).optional().nullable(),
	),
});

export const specialOrderReapprovalSchema = specialOrderRequestSchema.extend({
	reason: z.string().trim().min(3).max(500),
});

export const specialOrderRemovalSchema = z.object({
	salesId: z.number().int().positive(),
	reason: z.preprocess(
		(value) =>
			typeof value === "string" && value.trim() === "" ? null : value,
		z.string().trim().min(3).max(500).optional().nullable(),
	),
});

export const specialOrderPublicTokenSchema = z.object({
	token: z.string().trim().min(40).max(500),
});

export const specialOrderApprovalResponseSchema = specialOrderPublicTokenSchema
	.extend({
		decision: z.enum(["APPROVE", "DECLINE"]),
		acknowledged: z.boolean().optional(),
		printedName: z.string().trim().max(255).optional().nullable(),
		signatureDataUrl: z.string().max(5_600_000).optional().nullable(),
		declineReason: z.string().trim().max(2_000).optional().nullable(),
	})
	.superRefine((input, ctx) => {
		if (input.decision === "APPROVE") {
			if (input.acknowledged !== true) {
				ctx.addIssue({
					code: "custom",
					path: ["acknowledged"],
					message: "The Special Order acknowledgment is required.",
				});
			}
			if (!input.printedName || input.printedName.length < 2) {
				ctx.addIssue({
					code: "custom",
					path: ["printedName"],
					message: "Enter the signer’s printed name.",
				});
			}
			if (!input.signatureDataUrl?.startsWith("data:image/png;base64,")) {
				ctx.addIssue({
					code: "custom",
					path: ["signatureDataUrl"],
					message: "Draw a signature before approving.",
				});
			}
		}
		if (input.decision === "DECLINE" && !input.declineReason?.trim()) {
			ctx.addIssue({
				code: "custom",
				path: ["declineReason"],
				message: "A decline reason is required.",
			});
		}
	});

export const specialOrderHistorySchema = z.object({
	salesId: z.number().int().positive(),
});

export const specialOrderNotificationRetrySchema = z.object({
	salesId: z.number().int().positive(),
	deliveryId: z.string().trim().min(1).max(191),
});
