import { z } from "zod";
import { assistantDocumentProposalActionSchema } from "./document-action-contract";

const salesPurchaseOrderActionSchema = z
	.object({
		toolId: z.literal("sales_update_purchase_order"),
		toolVersion: z.literal(1),
		label: z.string().trim().min(1).max(100),
		input: z
			.object({
				orderNo: z.string().trim().min(1).max(64),
				type: z.enum(["order", "quote"]).optional(),
				expectedRevision: z.string().trim().min(1).max(191),
				previousPurchaseOrderNumber: z.string().trim().max(100),
				purchaseOrderNumber: z.string().trim().max(100),
			})
			.strict(),
	})
	.strict();

const financeManualPaymentActionSchema = z
	.object({
		toolId: z.literal("finance_record_manual_payment"),
		toolVersion: z.literal(1),
		label: z.string().trim().min(1).max(100),
		input: z
			.object({
				orderNo: z.string().trim().min(1).max(64),
				accountNo: z.string().trim().min(1).max(191),
				amount: z.number().positive().max(1_000_000_000),
				paymentMethod: z.enum([
					"check",
					"cash",
					"zelle",
					"credit-card",
					"wire",
				]),
				checkNo: z.string().trim().min(1).max(100).optional(),
				expectedAmountDue: z.string().trim().min(1).max(100),
				expectedRevision: z.string().trim().min(1).max(191),
			})
			.strict(),
	})
	.strict();

const financeSquareRefundActionSchema = z
	.object({
		toolId: z.literal("finance_create_square_refund"),
		toolVersion: z.literal(1),
		label: z.string().trim().min(1).max(100),
		input: z
			.object({
				orderNo: z.string().trim().min(1).max(64),
				transactionRef: z.string().trim().min(1).max(191),
				amount: z.number().positive().max(1_000_000_000),
				reason: z.string().trim().min(3).max(192),
				expectedRemainingRefundableCents: z.number().int().positive(),
				expectedRevision: z.string().trim().min(1).max(191),
			})
			.strict(),
	})
	.strict();

export const assistantProposalActionSchema = z.union([
	assistantDocumentProposalActionSchema,
	salesPurchaseOrderActionSchema,
	financeManualPaymentActionSchema,
	financeSquareRefundActionSchema,
]);

export const assistantProposalActionPartSchema = z
	.object({
		type: z.enum([
			"data-assistant-proposal-action",
			"data-assistant-document-action",
		]),
		id: z.string().trim().min(1).max(191),
		data: assistantProposalActionSchema,
	})
	.strict();

export type AssistantProposalAction = z.infer<
	typeof assistantProposalActionSchema
>;
