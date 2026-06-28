export function normalizeMobileWorkflowRoleTitle(roleTitle?: string | null) {
	return String(roleTitle || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}

export function canEditMobileServiceLinePricing(roleTitle?: string | null) {
	const normalizedRole = normalizeMobileWorkflowRoleTitle(roleTitle);
	const compactRole = normalizedRole.replace(/\s+/g, "");
	return normalizedRole === "super admin" || compactRole === "superadmin";
}
