export class AssistantProviderDisabledError extends Error {
	readonly code = "ASSISTANT_PROVIDER_DISABLED";

	constructor() {
		super("The assistant AI provider is disabled");
		this.name = "AssistantProviderDisabledError";
	}
}

export function isAssistantProviderEnabled(
	provider: string,
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	const disabled = new Set(
		(environment.ASSISTANT_DISABLED_PROVIDERS ?? "")
			.split(",")
			.map((entry) => entry.trim().toLowerCase())
			.filter(Boolean),
	);
	return !disabled.has(provider.toLowerCase());
}

export function assertAssistantProviderEnabled(
	provider: string,
	environment?: Readonly<Record<string, string | undefined>>,
) {
	if (!isAssistantProviderEnabled(provider, environment))
		throw new AssistantProviderDisabledError();
}

export function getAssistantApiKey(
	provider: string,
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	return (
		environment[`ASSISTANT_${provider.toUpperCase()}_API_KEY`]?.trim() ||
		(provider === "deepseek"
			? environment.SALES_REQUEST_DEEPSEEK_API_KEY?.trim()
			: undefined)
	);
}
