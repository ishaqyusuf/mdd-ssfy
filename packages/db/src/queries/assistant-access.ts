export type AssistantEntitlementSnapshot = {
	enabled: boolean;
	expiresAt: Date | null;
	version: number;
};

export type AssistantAccessState = {
	enabled: boolean;
	status: "enabled" | "disabled" | "expired";
	expiresAt: Date | null;
	version: number;
};

export function isAssistantPilotRoleAllowed(
	roleNames: readonly (string | null | undefined)[],
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	if (
		environment.ASSISTANT_SUPER_ADMIN_ONLY?.trim().toLowerCase() === "false"
	)
		return true;
	return roleNames.some(
		(roleName) => roleName?.trim().toLowerCase() === "super admin",
	);
}

/** Shared fail-closed evaluation for Assistant request and job continuations. */
export function evaluateAssistantAccessState(
	entitlement: AssistantEntitlementSnapshot | null,
	now: Date,
	globalEnabled = true,
): AssistantAccessState {
	if (!globalEnabled || !entitlement) {
		return {
			enabled: false,
			status: "disabled",
			expiresAt: entitlement?.expiresAt ?? null,
			version: entitlement?.version ?? 0,
		};
	}
	if (entitlement.expiresAt && entitlement.expiresAt <= now) {
		return {
			enabled: false,
			status: "expired",
			expiresAt: entitlement.expiresAt,
			version: entitlement.version,
		};
	}
	return {
		enabled: entitlement.enabled,
		status: entitlement.enabled ? "enabled" : "disabled",
		expiresAt: entitlement.expiresAt,
		version: entitlement.version,
	};
}
