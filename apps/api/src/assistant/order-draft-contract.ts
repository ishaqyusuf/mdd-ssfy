import { newSalesFormSeedSchema } from "@gnd/sales/sales-form-core";
import { z } from "zod";

export const assistantSalesRequestDraftInputSchema = z
	.object({
		type: z.enum(["order", "quote"]).default("order"),
		text: z.string().trim().min(1).max(50_000),
	})
	.strict();

export const assistantSalesRequestDraftPreviewSchema = z
	.object({
		type: z.enum(["order", "quote"]),
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
