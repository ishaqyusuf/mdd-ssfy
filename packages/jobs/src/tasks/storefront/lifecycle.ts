const DAY_MS = 24 * 60 * 60 * 1_000;

export function storefrontLifecycleCutoffs(now = new Date()) {
	return {
		abandonedCartAt: new Date(now.getTime() - 14 * DAY_MS),
		deleteRecoveryTokenAt: new Date(now.getTime() - 30 * DAY_MS),
	};
}
