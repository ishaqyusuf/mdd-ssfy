type DispatchCompletionAttempt = "continue" | "replay" | "conflict";

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function resolveDispatchCompletionAttempt(input: {
	status: string | null | undefined;
	meta: unknown;
	requestId: string | null | undefined;
}): DispatchCompletionAttempt {
	const requestId = input.requestId?.trim();
	if (!requestId || input.status !== "completed") return "continue";
	const completion = asRecord(asRecord(input.meta).dispatchCompletion);
	return completion.requestId === requestId ? "replay" : "conflict";
}
