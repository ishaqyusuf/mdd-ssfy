import { z } from "zod";
import { SALES_PAYMENT_METHODS } from "../../constants";

export const terminalPaymentSessionSchema = z
	.object({
		status: z.string(),
		squarePaymentId: z.string().optional(),
		squareCheckoutId: z.string().optional(),
	})
	.optional()
	.nullable();

export const salesPaymentProcessorApplyPaymentSchema = z
	.object({
		salesIds: z.array(z.number()).optional().nullable(),
		orderNos: z.array(z.string()).optional().nullable(),
		accountNo: z.string().optional(),
		paymentMethod: z.enum(SALES_PAYMENT_METHODS),
		amount: z.number(),
		_amount: z.any().optional().nullable(),
		checkNo: z.string().optional().nullable(),
		deviceId: z.string().optional().nullable(),
		deviceName: z.string().optional().nullable(),
		enableTip: z.boolean().optional().nullable(),
		walletBalance: z.number().optional().nullable(),
		useWallet: z.boolean().optional().nullable(),
		notifyCustomer: z.boolean().optional().nullable(),
		terminalPaymentSession: terminalPaymentSessionSchema,
	})
	.superRefine((data, ctx) => {
		if (data?._amount && Number(data._amount) > data?.amount) {
			ctx.addIssue({
				path: ["amount"],
				message: "Amount cannot be higher than sales due",
				code: "custom",
			});
		}
		if (data.paymentMethod === "check" && !data.checkNo) {
			ctx.addIssue({
				path: ["checkNo"],
				message: "Check No is required",
				code: "custom",
			});
		}
		if (data.paymentMethod === "terminal" && !data.deviceId) {
			ctx.addIssue({
				path: ["deviceId"],
				message: "Device Id is required",
				code: "custom",
			});
		}
	});

export type SalesPaymentProcessorApplyPaymentInput = z.infer<
	typeof salesPaymentProcessorApplyPaymentSchema
>;

export const salesPaymentProcessorCancelTerminalPaymentSchema = z.object({
	checkoutId: z.string().optional().nullable(),
	squarePaymentId: z.string().optional().nullable(),
});

export const salesPaymentProcessorTerminalStatusSchema = z.object({
	checkoutId: z.string(),
});

export const salesPaymentProcessorSendPaymentLinkSchema = z.object({
	amount: z.number(),
	customer: z.object({
		email: z.string(),
		name: z.string(),
	}),
	ids: z.array(z.number()),
	mode: z.literal("order").default("order"),
	type: z.literal("order").default("order"),
	walletId: z.number().optional().nullable(),
});
