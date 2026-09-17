export type AssistantQuotaSummaryInput = {
	configured: boolean;
	remaining: {
		requests: number | null;
		tokens: number | null;
	};
	resetAt: Date | string | null;
	warning: boolean;
};

export type AssistantQuotaSummary = {
	requests: string;
	tokens: string;
	reset: string | null;
	warning: boolean;
};

function formatRemaining(
	value: number | null,
	unit: "requests" | "tokens",
	locale?: string,
) {
	return value == null
		? `Unlimited ${unit}`
		: `${value.toLocaleString(locale)} ${unit} left`;
}

export function formatAssistantQuotaSummary(
	quota: AssistantQuotaSummaryInput,
	locale = "en-US",
): AssistantQuotaSummary {
	const resetAt = quota.resetAt ? new Date(quota.resetAt) : null;
	const reset =
		resetAt && !Number.isNaN(resetAt.getTime())
			? `Resets ${new Intl.DateTimeFormat(locale, {
					month: "short",
					day: "numeric",
					hour: "numeric",
					minute: "2-digit",
					timeZone: "UTC",
					timeZoneName: "short",
				}).format(resetAt)}`
			: null;

	return {
		requests: formatRemaining(quota.remaining.requests, "requests", locale),
		tokens: formatRemaining(quota.remaining.tokens, "tokens", locale),
		reset,
		warning: quota.configured && quota.warning,
	};
}
