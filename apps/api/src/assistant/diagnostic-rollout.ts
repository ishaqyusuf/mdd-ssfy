/** UI-only rollout. Diagnostic capture and authorization must not depend on it. */
export function assistantDiagnosticUiState(
	allowed: boolean,
	mode = process.env.ASSISTANT_DIAGNOSTICS_UI_ROLLOUT,
) {
	const rollout = mode ?? "super-admin";
	return { allowed, uiEnabled: allowed && rollout === "super-admin" };
}
