import {
    createInternalSalesFormWorkflowCapabilities,
    type SalesFormWorkflowCapabilities,
} from "@gnd/sales/sales-form";

export function normalizeWorkflowRoleTitle(roleTitle?: string | null) {
    return String(roleTitle || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}

export function createWwwWorkflowAdminCapabilities(
    roleTitle?: string | null,
): SalesFormWorkflowCapabilities {
    const normalizedRole = normalizeWorkflowRoleTitle(roleTitle);
    const compactRole = normalizedRole.replace(/\s+/g, "");
    const isSuperAdmin =
        normalizedRole === "super admin" || compactRole === "superadmin";
    return createInternalSalesFormWorkflowCapabilities({
        isWorkflowAdmin: normalizedRole === "admin" || isSuperAdmin,
        canEditLinePricing: isSuperAdmin,
    });
}
