export function assistantFeatureRequestDecision(
	action: "notify" | "not_now",
	releaseOptIn: boolean,
) {
	return action === "notify"
		? { submit: true as const, releaseOptIn }
		: { submit: false as const, releaseOptIn: false };
}
