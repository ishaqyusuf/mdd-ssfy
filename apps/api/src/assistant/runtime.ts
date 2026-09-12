import { randomUUID } from "node:crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
	type LanguageModel,
	type ModelMessage,
	ToolLoopAgent,
	smoothStream,
	stepCountIs,
} from "ai";
import type { AssistantEffect } from "./contracts";
import {
	ASSISTANT_PROMPT_VERSION,
	type AssistantPromptContext,
	buildAssistantSystemPrompt,
} from "./prompt";

export const ASSISTANT_CATALOG_VERSION = "assistant-catalog-v1";
export const ASSISTANT_MAX_STEPS = 10;
export const ASSISTANT_MAX_SELECTED_TOOLS = 12;
export const ASSISTANT_MAX_OUTPUT_TOKENS = 4_000;
export const ASSISTANT_MAX_RETRIES = 1;
export const ASSISTANT_FOREGROUND_DEADLINE_MS = 45_000;

const ASSISTANT_PROVIDER_CATALOG = {
	openai: ["gpt-5-mini", "gpt-5", "gpt-4.1-mini"],
	anthropic: [
		"claude-sonnet-5",
		"claude-sonnet-4-6",
		"claude-haiku-4-5-20251001",
	],
	deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
	google: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"],
} as const;

export type AssistantProvider = keyof typeof ASSISTANT_PROVIDER_CATALOG;
export type AssistantRuntimeSelection = {
	provider: AssistantProvider;
	model: string;
};

export type AssistantRuntimeToolEntry = {
	name: string;
	kind: "discovery" | "workflow";
	effect: AssistantEffect;
	tool: unknown;
};

type AssistantRuntimeWriter = {
	write(chunk: unknown): void;
};

export type AssistantRuntimeInput = {
	actor: Omit<
		AssistantPromptContext,
		"recentUploads" | "mentionedIntegrations"
	> & {
		userId: number;
		scopeType: string;
		scopeId: string;
	};
	modelMessages: ModelMessage[];
	recentUploads: AssistantPromptContext["recentUploads"];
	mentionedIntegrations: AssistantPromptContext["mentionedIntegrations"];
	writer: AssistantRuntimeWriter;
	signal: AbortSignal;
};

type AssistantAgent = {
	stream(input: {
		messages: ModelMessage[];
		abortSignal?: AbortSignal;
		timeout?: { totalMs: number };
		experimental_transform?: unknown;
	}): PromiseLike<{
		textStream: AsyncIterable<string>;
		totalUsage: PromiseLike<{
			inputTokens?: number;
			outputTokens?: number;
			totalTokens?: number;
		}>;
	}>;
};

type AssistantAgentSettings = {
	model: LanguageModel;
	instructions: string;
	tools: Record<string, unknown>;
	activeTools: string[];
	stopWhen: ReturnType<typeof stepCountIs>;
	maxOutputTokens: number;
	maxRetries: number;
};

export function resolveAssistantRuntimeSelection(
	environment: Readonly<Record<string, string | undefined>> = process.env,
): AssistantRuntimeSelection {
	const provider = (environment.ASSISTANT_AI_PROVIDER?.trim() ||
		"openai") as AssistantProvider;
	if (!(provider in ASSISTANT_PROVIDER_CATALOG)) {
		throw new Error("The assistant AI provider is not supported");
	}
	const model =
		environment.ASSISTANT_AI_MODEL?.trim() ||
		ASSISTANT_PROVIDER_CATALOG[provider][0];
	if (
		!(ASSISTANT_PROVIDER_CATALOG[provider] as readonly string[]).includes(model)
	) {
		throw new Error("The assistant AI model is not supported");
	}
	return { provider, model };
}

export function getAssistantRuntimeIdentity(
	environment?: Readonly<Record<string, string | undefined>>,
) {
	const selection = resolveAssistantRuntimeSelection(environment);
	return {
		...selection,
		modelIdentity: `${selection.provider}:${selection.model}`,
		catalogVersion: ASSISTANT_CATALOG_VERSION,
		promptVersion: ASSISTANT_PROMPT_VERSION,
	};
}

function requireAssistantApiKey(
	provider: AssistantProvider,
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	const key =
		environment[`ASSISTANT_${provider.toUpperCase()}_API_KEY`]?.trim();
	if (!key) throw new Error("The assistant AI provider is not configured");
	return key;
}

function createAssistantModel(
	selection: AssistantRuntimeSelection,
	environment?: Readonly<Record<string, string | undefined>>,
): LanguageModel {
	const apiKey = requireAssistantApiKey(selection.provider, environment);
	switch (selection.provider) {
		case "openai":
			return createOpenAI({ apiKey })(selection.model);
		case "anthropic":
			return createAnthropic({ apiKey })(selection.model);
		case "deepseek":
			return createDeepSeek({ apiKey })(selection.model);
		case "google":
			return createGoogleGenerativeAI({ apiKey })(selection.model);
	}
}

export function selectAssistantRuntimeTools(
	entries: AssistantRuntimeToolEntry[],
	maxTools = ASSISTANT_MAX_SELECTED_TOOLS,
) {
	return Object.fromEntries(
		entries
			.filter(
				(entry) =>
					entry.kind === "discovery" &&
					(entry.effect === "read" ||
						entry.effect === "draft" ||
						entry.effect === "artifact"),
			)
			.sort((left, right) => left.name.localeCompare(right.name))
			.slice(0, Math.max(0, Math.min(maxTools, ASSISTANT_MAX_SELECTED_TOOLS)))
			.map((entry) => [entry.name, entry.tool]),
	);
}

function finiteNonnegativeInteger(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? Math.floor(value)
		: 0;
}

export function createAssistantRuntime(options?: {
	selection?: AssistantRuntimeSelection;
	environment?: Readonly<Record<string, string | undefined>>;
	tools?: AssistantRuntimeToolEntry[];
	deadlineMs?: number;
	createModel?: (selection: AssistantRuntimeSelection) => LanguageModel;
	createAgent?: (settings: AssistantAgentSettings) => AssistantAgent;
	cleanup?: () => void | Promise<void>;
}) {
	const selection =
		options?.selection ??
		resolveAssistantRuntimeSelection(options?.environment);
	const model =
		options?.createModel?.(selection) ??
		createAssistantModel(selection, options?.environment);
	const tools = selectAssistantRuntimeTools(options?.tools ?? []);
	const deadlineMs = Math.max(
		1,
		Math.min(
			options?.deadlineMs ?? ASSISTANT_FOREGROUND_DEADLINE_MS,
			ASSISTANT_FOREGROUND_DEADLINE_MS,
		),
	);

	return {
		identity: getAssistantRuntimeIdentity({
			ASSISTANT_AI_PROVIDER: selection.provider,
			ASSISTANT_AI_MODEL: selection.model,
		}),
		async execute(input: AssistantRuntimeInput) {
			const timeoutController = new AbortController();
			const timeoutId = setTimeout(
				() =>
					timeoutController.abort(
						new DOMException("Timed out", "TimeoutError"),
					),
				deadlineMs,
			);
			const signal = AbortSignal.any([input.signal, timeoutController.signal]);
			const textId = randomUUID();
			let startedText = false;
			let assistantText = "";
			try {
				const instructions = buildAssistantSystemPrompt({
					...input.actor,
					recentUploads: input.recentUploads,
					mentionedIntegrations: input.mentionedIntegrations,
				});
				const settings: AssistantAgentSettings = {
					model,
					instructions,
					tools,
					activeTools: Object.keys(tools),
					stopWhen: stepCountIs(ASSISTANT_MAX_STEPS),
					maxOutputTokens: ASSISTANT_MAX_OUTPUT_TOKENS,
					maxRetries: ASSISTANT_MAX_RETRIES,
				};
				const agent =
					options?.createAgent?.(settings) ??
					(new ToolLoopAgent(settings as never) as unknown as AssistantAgent);
				const result = await agent.stream({
					messages: input.modelMessages,
					abortSignal: signal,
					timeout: { totalMs: deadlineMs },
					experimental_transform: smoothStream(),
				});
				for await (const delta of result.textStream) {
					if (!startedText) {
						input.writer.write({ type: "text-start", id: textId });
						startedText = true;
					}
					input.writer.write({ type: "text-delta", id: textId, delta });
					assistantText += delta;
				}
				if (startedText) input.writer.write({ type: "text-end", id: textId });
				if (!assistantText) {
					return {
						status: "failed" as const,
						errorCode: "ASSISTANT_EMPTY_RESPONSE",
						errorMessage: "Assistant runtime failed",
					};
				}
				const usage = await result.totalUsage;
				return {
					status: "succeeded" as const,
					assistantText,
					usage: {
						inputTokens: finiteNonnegativeInteger(usage.inputTokens),
						outputTokens: finiteNonnegativeInteger(usage.outputTokens),
						totalTokens: finiteNonnegativeInteger(usage.totalTokens),
						provider: selection.provider,
						model: selection.model,
					},
				};
			} catch {
				if (startedText) input.writer.write({ type: "text-end", id: textId });
				if (input.signal.aborted) {
					return {
						status: "cancelled" as const,
						errorCode: "ASSISTANT_RUN_CANCELLED",
						errorMessage: "Assistant run cancelled",
					};
				}
				if (timeoutController.signal.aborted) {
					return {
						status: "failed" as const,
						errorCode: "ASSISTANT_FOREGROUND_DEADLINE",
						errorMessage: "Assistant runtime failed",
					};
				}
				return {
					status: "failed" as const,
					errorCode: "ASSISTANT_PROVIDER_FAILED",
					errorMessage: "Assistant runtime failed",
				};
			} finally {
				clearTimeout(timeoutId);
				try {
					await options?.cleanup?.();
				} catch {
					// Cleanup must never replace the primary runtime outcome.
				}
			}
		},
	};
}
