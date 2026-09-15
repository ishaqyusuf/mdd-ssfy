import {
	SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES,
	SALES_REQUEST_GENERATION_ISSUE_CATEGORIES,
} from "@api/services/sales-request-feedback";
import { salesRequestPilotReviewDecisionInputSchema } from "@api/services/sales-request-pilot-review";
import { salesRequestMailboxPolicyInputSchema } from "@gnd/sales-request-mailbox";
import {
	salesRequestAISelectionSchema,
	salesRequestCatalogPolicySchema,
	salesRequestPilotReviewPolicyInputSchema,
	salesRequestPilotSettingsInputSchema,
	salesRequestProviderBenchmarkDecisionSchema,
} from "@gnd/settings";
import { z } from "zod";

export const setSalesRequestAISettingsSchema = salesRequestAISelectionSchema;

export const setSalesRequestProviderBenchmarkApprovalSchema =
	salesRequestProviderBenchmarkDecisionSchema;

export const setSalesRequestCatalogPolicySchema =
	salesRequestCatalogPolicySchema;

export const setSalesRequestPilotSettingsSchema =
	salesRequestPilotSettingsInputSchema;

export const setSalesRequestMailboxPolicySchema =
	salesRequestMailboxPolicyInputSchema;

export const setSalesRequestPilotReviewPolicySchema =
	salesRequestPilotReviewPolicyInputSchema;

export const recordSalesRequestPilotReviewDecisionSchema =
	salesRequestPilotReviewDecisionInputSchema;

export const salesRequestPilotAccessSchema = z
	.object({
		type: z.enum(["order", "quote"]),
	})
	.strict();

export const generateSalesRequestPreviewSchema = z
	.object({
		type: z.enum(["order", "quote"]),
		text: z.string().max(50_000).default(""),
		// Preserve the client request shell while the text pilot is active, but do
		// not expose a dormant image payload contract until Ticket 11 is resumed.
		images: z
			.array(z.never())
			.max(0, "Image input is deferred; provide pasted text only")
			.default([]),
	})
	.strict()
	.superRefine((input, ctx) => {
		if (!input.text.trim()) {
			ctx.addIssue({
				code: "custom",
				message: "Provide request text",
			});
		}
	});

export const validateSalesRequestPreviewSchema = z
	.object({
		type: z.enum(["order", "quote"]),
		configurationScope: z.string().trim().min(1).max(191),
		configurationRevision: z.string().trim().min(1).max(128),
		provider: z.string().trim().min(1).max(32),
		model: z.string().trim().min(1).max(100),
	})
	.strict();

const generationIdSchema = z.string().uuid();
const issueCategorySchema = z.enum(SALES_REQUEST_GENERATION_ISSUE_CATEGORIES);
const changedFieldCategorySchema = z.enum(
	SALES_REQUEST_GENERATION_CHANGED_FIELD_CATEGORIES,
);

export const recordSalesRequestGenerationOutcomeSchema = z
	.discriminatedUnion("kind", [
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
	])
	.superRefine((input, ctx) => {
		if (input.kind !== "feedback") return;
		if (input.outcome === "rejected" && !input.issueCategories.length) {
			ctx.addIssue({
				code: "custom",
				path: ["issueCategories"],
				message: "Select at least one rejection issue category",
			});
		}
		if (
			input.outcome === "accepted-with-edits" &&
			!input.changedFieldCategories.length
		) {
			ctx.addIssue({
				code: "custom",
				path: ["changedFieldCategories"],
				message: "Select at least one changed field category",
			});
		}
	});

export const listSalesRequestFinalSaveExceptionsSchema = z
	.object({
		limit: z.number().int().min(1).max(50).default(25),
	})
	.strict();

export const salesRequestGenerationPilotSummarySchema = z
	.object({
		// A UTC calendar date identifies one immutable, closed seven-day slice.
		periodStart: z.string().date(),
	})
	.strict();

export const answerSalesRequestClarificationSchema = z
	.object({
		sessionId: z.string().uuid(),
		revision: z.number().int().positive(),
		answers: z
			.array(
				z
					.object({
						questionId: z.string().uuid(),
						answer: z.string().trim().min(1).max(2000),
						reuse: z.boolean().default(true),
					})
					.strict(),
			)
			.min(1)
			.max(300),
	})
	.strict();
export const salesRequestClarificationSessionSchema = z
	.object({ sessionId: z.string().uuid() })
	.strict();
export const setSalesRequestGuidanceSchema = z
	.object({
		sessionId: z.string().uuid(),
		questionId: z.string().uuid(),
		active: z.boolean(),
		answer: z.string().trim().min(1).max(2000).optional(),
	})
	.strict();
