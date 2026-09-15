import { z } from "zod";
import { decodeAssistantDiagnosticCursor } from "@gnd/db/assistant-diagnostic-cursor";

export const assistantClientDiagnosticSchema = z
	.object({
		eventId: z.string().uuid(),
		conversationId: z.string().min(1).max(191).optional(),
		runId: z.string().min(1).max(191).optional(),
		stage: z.enum(["transport", "render", "attachment", "reconnect"]),
	})
	.strict()
	.refine(
		(input) =>
			input.conversationId ||
			(!input.runId &&
				(input.stage === "attachment" || input.stage === "render")),
		{ message: "A conversation is required for this report." },
	);
import { assistantOutcomeSchema } from "./outcomes";

export const assistantDiagnosticStageSchema = z.enum([
	"request",
	"authentication",
	"configuration",
	"provider",
	"tool-input",
	"tool",
	"tool-output",
	"database",
	"attachment",
	"document",
	"action",
	"stream",
	"history",
	"client",
]);
export type AssistantDiagnosticStage = z.infer<
	typeof assistantDiagnosticStageSchema
>;
export const assistantDiagnosticReferenceSchema = z
	.string()
	.regex(/^ERR-[A-Z0-9]{10}$/);

export function assistantErrorReference(error: unknown): string | null {
	if (!error || typeof error !== "object") return null;
	const candidate = error as {
		data?: { appError?: { referenceId?: unknown } };
	};
	const parsed = assistantDiagnosticReferenceSchema.safeParse(
		candidate.data?.appError?.referenceId,
	);
	return parsed.success ? parsed.data : null;
}
export const assistantDiagnosticFilterSchema = z
	.object({
		status: z.enum(["new", "investigating", "resolved"]).optional(),
		stage: assistantDiagnosticStageSchema.optional(),
		outcome: assistantOutcomeSchema.shape.kind.optional(),
		provider: z.enum(["openai", "anthropic", "deepseek", "google"]).optional(),
		model: z.string().trim().min(1).max(100).optional(),
		environment: z.string().trim().min(1).max(32).optional(),
		reference: assistantDiagnosticReferenceSchema.optional(),
		from: z.coerce.date().optional(),
		to: z.coerce.date().optional(),
		cursor: z
			.string()
			.max(64)
			.refine(
				(value) => decodeAssistantDiagnosticCursor(value) !== null,
				"Invalid page cursor",
			)
			.optional(),
		take: z.number().int().min(1).max(50).default(20),
	})
	.strict()
	.refine((input) => !input.from || !input.to || input.from <= input.to, {
		message: "The end date must follow the start date.",
		path: ["to"],
	});
export const assistantDiagnosticReviewSchema = z
	.object({
		reference: assistantDiagnosticReferenceSchema,
		status: z.enum(["new", "investigating", "resolved"]),
		note: z.string().trim().max(2000).default(""),
	})
	.strict();

export type AssistantDiagnosticFilters = z.infer<
	typeof assistantDiagnosticFilterSchema
>;
