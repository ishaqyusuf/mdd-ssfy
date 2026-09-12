import {
	SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES,
	SALES_REQUEST_GENERATION_ISSUE_CATEGORIES,
} from "@api/services/sales-request-telemetry";
import {
	salesRequestAISelectionSchema,
	salesRequestCatalogPolicySchema,
} from "@gnd/settings";
import { z } from "zod";

export const setSalesRequestAISettingsSchema = salesRequestAISelectionSchema;

export const setSalesRequestCatalogPolicySchema =
	salesRequestCatalogPolicySchema;

export const setSalesRequestDefaultSchema = z
	.object({
		rootUid: z.string().trim().min(1).max(128),
		stepUid: z.string().trim().min(1).max(128),
		componentUid: z.string().trim().min(1).max(128).nullable(),
	})
	.strict();

export const generateSalesRequestPreviewSchema = z
	.object({
		text: z.string().max(50_000).default(""),
		images: z
			.array(
				z
					.object({
						mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
						base64: z
							.string()
							.min(4)
							.max(6_990_508)
							.regex(
								/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
							),
					})
					.strict(),
			)
			.max(3)
			.default([]),
	})
	.strict()
	.superRefine((input, ctx) => {
		if (!input.text.trim() && !input.images.length) {
			ctx.addIssue({
				code: "custom",
				message: "Provide request text or images",
			});
		}
		if (
			input.images.reduce((sum, image) => sum + image.base64.length, 0) >
			13_981_016
		) {
			ctx.addIssue({
				code: "custom",
				message: "Request images exceed the combined limit",
			});
		}
	});

const generationIdSchema = z.string().uuid();
const issueCategorySchema = z.enum(SALES_REQUEST_GENERATION_ISSUE_CATEGORIES);
const changedFieldCategorySchema = z.enum(
	SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES,
);

export const recordSalesRequestGenerationOutcomeSchema = z.discriminatedUnion(
	"kind",
	[
		z
			.object({
				generationId: generationIdSchema,
				kind: z.literal("apply"),
				outcome: z.enum(["applied", "blocked", "stale", "unavailable"]),
			})
			.strict(),
		z
			.object({
				generationId: generationIdSchema,
				kind: z.literal("save"),
				stage: z.enum(["draft", "final"]),
				outcome: z.enum(["saved", "failed"]),
			})
			.strict(),
		z
			.object({
				generationId: generationIdSchema,
				kind: z.literal("feedback"),
				outcome: z.enum(["accepted", "accepted-with-edits", "rejected"]),
				issueCategories: z.array(issueCategorySchema).max(12).default([]),
				changedFieldCategories: z
					.array(changedFieldCategorySchema)
					.max(12)
					.default([]),
			})
			.strict(),
	],
);

export const salesRequestGenerationPilotSummarySchema = z
	.object({
		days: z.number().int().min(1).max(90).default(30),
	})
	.strict()
	.default({ days: 30 });
