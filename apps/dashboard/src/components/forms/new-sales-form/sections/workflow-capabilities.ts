import {
	type SalesFormWorkflowCapabilities,
	createInternalSalesFormWorkflowCapabilities,
} from "@gnd/sales/sales-form";

function normalizeWorkflowRoleTitle(roleTitle?: string | null) {
	return String(roleTitle || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}

export function createWwwWorkflowAdminCapabilities(input: {
	roleTitle?: string | null;
	canEditOrders?: boolean | null;
	canEditSalesComponent?: boolean | null;
}): SalesFormWorkflowCapabilities {
	const normalizedRole = normalizeWorkflowRoleTitle(input.roleTitle);
	const compactRole = normalizedRole.replace(/\s+/g, "");
	const isSuperAdmin =
		normalizedRole === "super admin" || compactRole === "superadmin";
	return createInternalSalesFormWorkflowCapabilities({
		isWorkflowAdmin: normalizedRole === "admin" || isSuperAdmin,
		canEditSalesComponent: Boolean(input.canEditSalesComponent),
		canEditLinePricing: isSuperAdmin,
		canEditServiceLinePricing: isSuperAdmin || Boolean(input.canEditOrders),
		canEditWorkflowComponentPricing: isSuperAdmin,
	});
}
