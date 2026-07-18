import type {
	ColumnDef,
	ColumnOrderState,
	ColumnSizingState,
	VisibilityState,
} from "@tanstack/react-table";

export type TableId =
	| "sales-orders"
	| "sales-quotes"
	| "customers"
	| "customer-transactions"
	| "customer-pay-portal"
	| "customer-sales-list"
	| "customer-sales-workspace"
	| "customer-overview-sales-preview"
	| "customer-statement-report"
	| "customer-statement-lines"
	| "door-suppliers"
	| "clean-code-door-size-select-lines"
	| "sales-form-takeoff-hpt-lines"
	| "sales-form-hpt-lines"
	| "sales-form-moulding-lines"
	| "clean-code-sales-form-moulding-lines"
	| "sales-form-service-lines"
	| "clean-code-sales-form-service-lines"
	| "sales-form-shelf-items"
	| "builder-form-tasks"
	| "role-form-permissions"
	| "employee-form-permissions"
	| "job-scope"
	| "new-job-install-tasks"
	| "inventory-product-form-variants"
	| "inventory-product-form-sub-components"
	| "unit-invoice-form-tasks"
	| "community-model-cost-form-tasks"
	| "community-install-cost-form-tasks"
	| "dealers"
	| "employees"
	| "roles"
	| "employee-profiles"
	| "contractor-jobs"
	| "contractor-payouts"
	| "contractor-payout-overview-jobs"
	| "payment-dashboard-contractors"
	| "payment-dashboard-recent-payments"
	| "payment-portal-jobs"
	| "site-actions"
	| "short-links"
	| "packing-list"
	| "shelf-items"
	| "sales-email-ledger"
	| "task-events"
	| "task-run-diagnostics"
	| "task-event-history"
	| "document-approvals"
	| "bug-reports"
	| "bug-report-access-employees"
	| "notification-channels"
	| "master-password-logins"
	| "user-logged-in-devices"
	| "legacy-square-payment-orders"
	| "sales-rep-design-activity"
	| "transaction-overview-applications"
	| "transaction-overview-payments"
	| "sales-rep-commission-payments"
	| "sales-rep-commissions"
	| "community-projects"
	| "project-units"
	| "sales-dispatch"
	| "inbound-management"
	| "sales-inbounds"
	| "sales-accounting"
	| "sales-resolution"
	| "sales-production"
	| "sales-statistics"
	| "inventory-products"
	| "inventory-categories"
	| "inventory-suppliers"
	| "inventory-import"
	| "inventory-allocations"
	| "inventory-variants"
	| "inventory-backorders"
	| "inventory-inbounds"
	| "inventory-partial-shipments"
	| "inventory-dispatch-mode"
	| "inventory-production-plan"
	| "inventory-kind-review"
	| "inventory-stock-audit"
	| "inventory-item-variants"
	| "inventory-item-stocks"
	| "inventory-item-movements"
	| "inventory-item-inbound-demands"
	| "inventory-item-allocations"
	| "inventory-item-related-lines"
	| "community-builders"
	| "community-templates"
	| "community-install-costs"
	| "customer-service"
	| "unit-invoices"
	| "unit-productions";

export type TableViewMode = "table" | "grid";

export interface TableSettings {
	columns: VisibilityState;
	sizing: ColumnSizingState;
	order: ColumnOrderState;
	showColumnDividers?: boolean;
	viewMode?: TableViewMode;
}

export type AllTableSettings = {
	[K in TableId]?: Partial<TableSettings>;
};

export const TABLE_SETTINGS_COOKIE = "gnd-table-settings";

const defaultHiddenColumns: Record<TableId, string[]> = {
	"sales-orders": [
		"amountDue",
		"productionLabel",
		"fulfillmentLabel",
		"salesRepName",
	],
	"sales-quotes": ["salesRepInitial"],
	customers: ["email"],
	"customer-transactions": [],
	"customer-pay-portal": [],
	"customer-sales-list": [],
	"customer-sales-workspace": [],
	"customer-overview-sales-preview": [],
	"customer-statement-report": [],
	"customer-statement-lines": [],
	"door-suppliers": [],
	"clean-code-door-size-select-lines": [],
	"sales-form-takeoff-hpt-lines": [],
	"sales-form-hpt-lines": [],
	"sales-form-moulding-lines": [],
	"clean-code-sales-form-moulding-lines": [],
	"sales-form-service-lines": [],
	"clean-code-sales-form-service-lines": [],
	"sales-form-shelf-items": [],
	"builder-form-tasks": [],
	"role-form-permissions": [],
	"employee-form-permissions": [],
	"job-scope": [],
	"new-job-install-tasks": [],
	"inventory-product-form-variants": [],
	"inventory-product-form-sub-components": [],
	"unit-invoice-form-tasks": [],
	"community-model-cost-form-tasks": [],
	"community-install-cost-form-tasks": [],
	dealers: [],
	employees: [],
	roles: [],
	"employee-profiles": [],
	"contractor-jobs": [],
	"contractor-payouts": [],
	"contractor-payout-overview-jobs": [],
	"payment-dashboard-contractors": [],
	"payment-dashboard-recent-payments": [],
	"payment-portal-jobs": [],
	"site-actions": [],
	"short-links": [],
	"packing-list": [],
	"shelf-items": [],
	"sales-email-ledger": [],
	"task-events": [],
	"task-run-diagnostics": [],
	"task-event-history": [],
	"document-approvals": [],
	"bug-reports": [],
	"bug-report-access-employees": [],
	"notification-channels": [],
	"master-password-logins": [],
	"user-logged-in-devices": [],
	"legacy-square-payment-orders": [],
	"sales-rep-design-activity": [],
	"transaction-overview-applications": [],
	"transaction-overview-payments": [],
	"sales-rep-commission-payments": [],
	"sales-rep-commissions": [],
	"community-projects": [],
	"project-units": [],
	"sales-dispatch": [],
	"inbound-management": [],
	"sales-inbounds": [],
	"sales-accounting": [],
	"sales-resolution": [],
	"sales-production": [],
	"sales-statistics": [],
	"inventory-products": [],
	"inventory-categories": [],
	"inventory-suppliers": [],
	"inventory-import": [],
	"inventory-allocations": ["references"],
	"inventory-variants": ["attributes"],
	"inventory-backorders": [],
	"inventory-inbounds": [],
	"inventory-partial-shipments": [],
	"inventory-dispatch-mode": ["blockers"],
	"inventory-production-plan": ["received"],
	"inventory-kind-review": [],
	"inventory-stock-audit": [],
	"inventory-item-variants": [],
	"inventory-item-stocks": [],
	"inventory-item-movements": [],
	"inventory-item-inbound-demands": [],
	"inventory-item-allocations": [],
	"inventory-item-related-lines": [],
	"community-builders": [],
	"community-templates": [],
	"community-install-costs": [],
	"customer-service": [],
	"unit-invoices": [],
	"unit-productions": [],
};

function getDefaultColumnVisibility(tableId: TableId): VisibilityState {
	return defaultHiddenColumns[tableId].reduce(
		(acc, columnId) => {
			acc[columnId] = false;
			return acc;
		},
		{} as Record<string, boolean>,
	);
}

function getDefaultTableSettings(tableId: TableId): TableSettings {
	return {
		columns: getDefaultColumnVisibility(tableId),
		sizing: {},
		order: [],
		viewMode: "table",
	};
}

export function mergeWithDefaults(
	saved: Partial<TableSettings> | undefined,
	tableId: TableId,
): TableSettings {
	const defaults = getDefaultTableSettings(tableId);

	return {
		columns: {
			...defaults.columns,
			...saved?.columns,
		},
		sizing: saved?.sizing ?? defaults.sizing,
		order: saved?.order ?? defaults.order,
		showColumnDividers: saved?.showColumnDividers,
		viewMode: saved?.viewMode ?? defaults.viewMode,
	};
}

export function getColumnIds<TData>(columns: ColumnDef<TData>[]): string[] {
	return columns
		.map(
			(column) =>
				column.id ??
				(column as ColumnDef<TData> & { accessorKey?: string }).accessorKey ??
				"",
		)
		.filter(Boolean);
}

export function normalizeColumnOrder(
	savedOrder: ColumnOrderState,
	allColumnIds: string[],
): ColumnOrderState {
	if (savedOrder.length === 0) return savedOrder;

	const definedIds = new Set(allColumnIds);
	const savedIds = new Set(savedOrder);
	const orderWithoutActions = savedOrder.filter(
		(id) => id !== "actions" && definedIds.has(id),
	);
	const newColumns = allColumnIds.filter(
		(id) => id !== "actions" && !savedIds.has(id),
	);
	const result = [...orderWithoutActions, ...newColumns];

	if (definedIds.has("actions")) {
		result.push("actions");
	}

	return result;
}
