export function isAssistantPdfGenerationEnabled(
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	const disabledValues = (value: string | undefined) =>
		new Set(
			(value ?? "")
				.split(",")
				.map((entry) => entry.trim().toLowerCase())
				.filter(Boolean),
		);
	return (
		environment.ASSISTANT_ENABLED?.trim().toLowerCase() !== "false" &&
		environment.ASSISTANT_READ_ONLY_CANARY?.trim().toLowerCase() !== "true" &&
		!disabledValues(environment.ASSISTANT_DISABLED_TOOL_DOMAINS).has(
			"documents",
		) &&
		!disabledValues(environment.ASSISTANT_DISABLED_TOOL_EFFECTS).has(
			"artifact",
		)
	);
}
