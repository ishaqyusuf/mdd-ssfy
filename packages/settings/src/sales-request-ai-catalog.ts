import { z } from "zod";

export const SALES_REQUEST_AI_PROVIDERS = [
	"openai",
	"anthropic",
	"deepseek",
	"google",
] as const;

export type SalesRequestAIProvider =
	(typeof SALES_REQUEST_AI_PROVIDERS)[number];

export type SalesRequestAIModelOption = {
	id: string;
	label: string;
	supportsImages: boolean;
};

export type SalesRequestAIProviderOption = {
	id: SalesRequestAIProvider;
	label: string;
	defaultModel: string;
	models: readonly SalesRequestAIModelOption[];
};

export type SalesRequestAISelection = {
	provider: SalesRequestAIProvider;
	model: string;
};

export const SALES_REQUEST_AI_PROVIDER_CATALOG = [
	{
		id: "openai",
		label: "OpenAI",
		defaultModel: "gpt-5-mini",
		models: [
			{ id: "gpt-5-mini", label: "GPT-5 mini", supportsImages: true },
			{ id: "gpt-5", label: "GPT-5", supportsImages: true },
			{ id: "gpt-4.1-mini", label: "GPT-4.1 mini", supportsImages: true },
		],
	},
	{
		id: "anthropic",
		label: "Anthropic",
		defaultModel: "claude-sonnet-5",
		models: [
			{
				id: "claude-sonnet-5",
				label: "Claude Sonnet 5",
				supportsImages: true,
			},
			{
				id: "claude-sonnet-4-6",
				label: "Claude Sonnet 4.6",
				supportsImages: true,
			},
			{
				id: "claude-haiku-4-5-20251001",
				label: "Claude Haiku 4.5",
				supportsImages: true,
			},
		],
	},
	{
		id: "deepseek",
		label: "DeepSeek",
		defaultModel: "deepseek-v4-flash",
		models: [
			{
				id: "deepseek-v4-flash",
				label: "DeepSeek V4 Flash",
				supportsImages: false,
			},
			{
				id: "deepseek-v4-pro",
				label: "DeepSeek V4 Pro",
				supportsImages: false,
			},
		],
	},
	{
		id: "google",
		label: "Google Gemini",
		defaultModel: "gemini-3.8-flash",
		models: [
			{
				id: "gemini-3.8-flash",
				label: "Gemini 3.8 Flash",
				supportsImages: true,
			},
			{
				id: "gemini-3.5-flash-lite",
				label: "Gemini 3.5 Flash Lite",
				supportsImages: true,
			},
			{
				id: "gemini-2.5-flash",
				label: "Gemini 2.5 Flash",
				supportsImages: true,
			},
			{
				id: "gemini-2.5-pro",
				label: "Gemini 2.5 Pro",
				supportsImages: true,
			},
		],
	},
] as const satisfies readonly SalesRequestAIProviderOption[];

export const DEFAULT_SALES_REQUEST_AI_SELECTION = {
	provider: "openai",
	model: "gpt-5-mini",
} as const satisfies SalesRequestAISelection;

const salesRequestAIProviderSchema = z.enum(SALES_REQUEST_AI_PROVIDERS);

export function getSalesRequestAIProviderOption(
	provider: SalesRequestAIProvider,
): SalesRequestAIProviderOption {
	const option = SALES_REQUEST_AI_PROVIDER_CATALOG.find(
		(candidate) => candidate.id === provider,
	);
	if (!option)
		throw new Error(`Unsupported sales request AI provider: ${provider}`);
	return option;
}

export function isSalesRequestAIModel(
	provider: SalesRequestAIProvider,
	model: string,
) {
	return getSalesRequestAIProviderOption(provider).models.some(
		(option) => option.id === model,
	);
}

export const salesRequestAISelectionSchema = z
	.object({
		provider: salesRequestAIProviderSchema,
		model: z.string().trim().min(1).max(128),
	})
	.strict()
	.superRefine((selection, ctx) => {
		if (!isSalesRequestAIModel(selection.provider, selection.model)) {
			ctx.addIssue({
				code: "custom",
				path: ["model"],
				message: `Model ${selection.model} is not allowed for ${selection.provider}`,
			});
		}
	});
