import type { ModelMessage } from "ai";
import {
	assistantOutcomeSchema,
	assistantOutcomeFromEnvelope,
	presentAssistantOutcome,
} from "./outcomes";

function record(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** Runs before every model step, including SDK validation failures outside MCP callbacks. */
export function assistantModelSafeMessages(
	messages: ModelMessage[],
): ModelMessage[] {
	return messages.map((message) => {
		if (message.role !== "tool") return message;
		return {
			...message,
			content: message.content.map((part) => {
				if (part.type !== "tool-result") return part;
				if (
					part.output.type === "error-text" ||
					part.output.type === "error-json"
				) {
					return {
						...part,
						output: {
							type: "error-text" as const,
							value:
								"This check could not be completed. Do not describe technical causes or claim that a change was saved.",
						},
					};
				}
				if (part.output.type !== "json") return part;
				const value = record(part.output.value);
				if (value?.isError === true) {
					const parsed = assistantOutcomeSchema.safeParse(
						record(value._meta)?.assistantOutcome,
					);
					const kind = parsed.success ? parsed.data.kind : "temporary";
					return {
						...part,
						output: {
							type: "json" as const,
							value: {
								outcome: kind,
								message: presentAssistantOutcome({ kind }).message,
							},
						},
					};
				}
				const envelope = record(value?.structuredContent) ?? value;
				const kind = assistantOutcomeFromEnvelope(envelope);
				if (!kind) return part;
				return {
					...part,
					output: {
						type: "json" as const,
						value: {
							outcome: kind,
							message: presentAssistantOutcome({ kind }).message,
						},
					},
				};
			}),
		};
	});
}

export async function prepareAssistantSafeStep(
	prepare: ((input: unknown) => unknown | Promise<unknown>) | undefined,
	input: unknown,
) {
	const prepared = record(await prepare?.(input));
	const messages = prepared?.messages ?? record(input)?.messages;
	if (!Array.isArray(messages)) return prepared ?? undefined;
	return {
		...prepared,
		messages: assistantModelSafeMessages(messages as ModelMessage[]),
	};
}
