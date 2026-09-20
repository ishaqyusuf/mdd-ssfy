import { newSalesFormSeedSchema } from "@gnd/sales/sales-form-core";
import { z } from "zod";

export const assistantSalesRequestDraftInputSchema = z
	.object({
		type: z.enum(["order", "quote"]).default("order"),
		text: z
			.string()
			.min(1)
			.max(50_000)
			.refine((value) => value.trim().length > 0, "Request text is required"),
	})
	.strict();

export const assistantSalesRequestDraftPreviewSchema = z
	.object({
		type: z.enum(["order", "quote"]),
		// Retain the exact website request for the reviewed native Sales handoff.
		// Older persisted Assistant messages remain valid without this field.
		sourceText: z.string().max(50_000).optional(),
		generationId: z.string().uuid(),
		seed: newSalesFormSeedSchema,
		configurationScope: z.string().min(1).max(191),
		configurationRevision: z.string().min(1).max(128),
		promptVersion: z.string().min(1).max(100),
		provider: z.string().min(1).max(32),
		model: z.string().min(1).max(100),
		usage: z
			.object({
				inputTokens: z.number().int().nonnegative().nullable(),
				outputTokens: z.number().int().nonnegative().nullable(),
			})
			.strict(),
		unresolvedCount: z.number().int().nonnegative(),
		savedSale: z.object({
			orderId: z.string().trim().min(1),
			slug: z.string().trim().min(1),
		}).strict().optional(),
	})
	.strict();

export const assistantOrderDraftPartSchema = z
	.object({
		type: z.literal("data-assistant-order-draft"),
		id: z.string().trim().min(1).max(240),
		data: assistantSalesRequestDraftPreviewSchema,
	})
	.strict();

export type AssistantSalesRequestDraftPreview = z.infer<
	typeof assistantSalesRequestDraftPreviewSchema
>;
