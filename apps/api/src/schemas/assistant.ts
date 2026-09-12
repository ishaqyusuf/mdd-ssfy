import { z } from "zod";

const assistantTextPartSchema = z
	.object({
		type: z.literal("text"),
		text: z.string().min(1).max(32_000),
	})
	.strict();

const assistantFilePartSchema = z
	.object({
		type: z.literal("file"),
		documentId: z.string().min(1).max(191),
	})
	.strict();

export const assistantChatRequestSchema = z
	.object({
		conversationId: z.string().min(1).max(191),
		requestId: z.string().min(1).max(191),
		message: z
			.object({
				id: z.string().min(1).max(191),
				role: z.literal("user"),
				parts: z
					.array(
						z.discriminatedUnion("type", [
							assistantTextPartSchema,
							assistantFilePartSchema,
						]),
					)
					.min(1)
					.max(20),
			})
			.strict(),
		timezone: z.string().min(1).max(100).optional(),
		localTime: z.string().datetime({ offset: true }).optional(),
		mentionedIntegrationIds: z
			.array(z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/))
			.max(8)
			.default([]),
	})
	.strict()
	.superRefine((value, context) => {
		if (!value.timezone) return;
		try {
			new Intl.DateTimeFormat("en-US", { timeZone: value.timezone }).format();
		} catch {
			context.addIssue({
				code: "custom",
				path: ["timezone"],
				message: "Timezone must be a valid IANA timezone",
			});
		}
	});

export const assistantReconnectParamsSchema = z.object({
	runId: z.string().min(1).max(191),
	afterSequence: z.coerce.number().int().min(0).default(0),
	afterRunSequence: z.coerce.number().int().min(0).default(0),
});

export const assistantReconnectResponseSchema = z
	.object({
		runId: z.string().min(1),
		status: z.string().min(1).max(32),
		lastSequence: z.number().int().min(0),
		errorCode: z.string().max(100).nullable(),
		completedAt: z.string().datetime({ offset: true }).nullable(),
		conversationId: z.string().min(1).nullable(),
		messages: z
			.array(
				z
					.object({
						id: z.string().min(1),
						sequence: z.number().int().positive(),
						role: z.string().min(1).max(20),
						parts: z.array(z.unknown()).max(20),
						createdAt: z.string().datetime({ offset: true }),
					})
					.strict(),
			)
			.max(500),
		toolExecutions: z
			.array(
				z
					.object({
						id: z.string().min(1),
						eventSequence: z.number().int().positive(),
						toolId: z.string().min(1).max(191),
						toolVersion: z.number().int().positive(),
						effect: z.string().min(1).max(32),
						status: z.string().min(1).max(32),
						result: z.unknown().nullable(),
						errorCode: z.string().max(100).nullable(),
						durationMs: z.number().int().min(0).nullable(),
						completedAt: z.string().datetime({ offset: true }).nullable(),
					})
					.strict(),
			)
			.max(200),
		actionProposals: z
			.array(
				z
					.object({
						id: z.string().min(1),
						eventSequence: z.number().int().positive(),
						toolId: z.string().min(1).max(191),
						toolVersion: z.number().int().positive(),
						effect: z.string().min(1).max(32),
						status: z.string().min(1).max(32),
						expiresAt: z.string().datetime({ offset: true }),
					})
					.strict(),
			)
			.max(200),
	})
	.strict();

export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;
