import type {
	StickyColumnConfig,
	TableConfig,
} from "@/components/tables-2/core";
import type { TableId } from "@/utils/table-settings";

export const STICKY_COLUMNS: Record<TableId, StickyColumnConfig[]> = {
	"sales-orders": [
		{ id: "select", width: 50 },
		{ id: "orderId", width: 220 },
	],
	"sales-quotes": [
		{ id: "select", width: 50 },
		{ id: "orderId", width: 220 },
	],
	customers: [{ id: "customer", width: 300 }],
	"sales-dispatch": [
		{ id: "select", width: 50 },
		{ id: "orderId", width: 180 },
	],
	"inbound-management": [{ id: "orderId", width: 180 }],
	"sales-accounting": [
		{ id: "select", width: 50 },
		{ id: "createdAt", width: 150 },
	],
	"sales-statistics": [{ id: "productName", width: 320 }],
	"inventory-products": [
		{ id: "select", width: 50 },
		{ id: "product", width: 320 },
	],
	"inventory-categories": [
		{ id: "select", width: 50 },
		{ id: "category", width: 320 },
	],
	"inventory-import": [{ id: "category", width: 340 }],
	"community-builders": [{ id: "builder", width: 340 }],
	"community-templates": [{ id: "model", width: 320 }],
	"customer-service": [
		{ id: "select", width: 50 },
		{ id: "appointment", width: 180 },
	],
	"unit-invoices": [{ id: "lotBlock", width: 280 }],
	"unit-productions": [
		{ id: "select", width: 50 },
		{ id: "dueDate", width: 170 },
	],
};

export const SORT_FIELD_MAPS: Record<TableId, Record<string, string>> = {
	"sales-orders": {
		orderId: "orderId",
		status: "status",
		salesDate: "createdAt",
		customerName: "customerName",
		invoiceTotal: "grandTotal",
		amountDue: "amountDue",
		productionLabel: "prodStatus",
		fulfillmentLabel: "deliveredAt",
		salesRepName: "salesRepName",
	},
	"sales-quotes": {
		orderId: "orderId",
		salesDate: "createdAt",
		invoiceTotal: "grandTotal",
	},
	customers: {
		customer: "name",
		phoneNo: "phoneNo",
		email: "email",
		address: "address",
	},
	"sales-dispatch": {
		orderId: "orderId",
		dueDate: "dueDate",
		orderDate: "createdAt",
		status: "status",
		assignedTo: "driverId",
	},
	"inbound-management": {},
	"sales-accounting": {},
	"sales-statistics": {},
	"inventory-products": {},
	"inventory-categories": {},
	"inventory-import": {},
	"community-builders": {
		builder: "name",
	},
	"community-templates": {
		model: "modelName",
	},
	"customer-service": {
		appointment: "scheduleDate",
		customer: "homeOwner",
		status: "status",
	},
	"unit-invoices": {
		lotBlock: "lotBlock",
		project: "project",
		date: "date",
	},
	"unit-productions": {
		dueDate: "dueDate",
		task: "task",
		unit: "unit",
		project: "project",
	},
};

export const NON_REORDERABLE_COLUMNS: Record<TableId, Set<string>> = {
	"sales-orders": new Set(["select", "orderId", "actions"]),
	"sales-quotes": new Set(["select", "orderId", "actions"]),
	customers: new Set(["customer", "actions"]),
	"sales-dispatch": new Set(["select", "orderId", "actions"]),
	"inbound-management": new Set(["orderId", "actions"]),
	"sales-accounting": new Set(["select", "createdAt", "actions"]),
	"sales-statistics": new Set(["productName"]),
	"inventory-products": new Set(["select", "product", "actions"]),
	"inventory-categories": new Set(["select", "category", "actions"]),
	"inventory-import": new Set(["category"]),
	"community-builders": new Set(["builder", "actions"]),
	"community-templates": new Set(["model", "actions"]),
	"customer-service": new Set(["select", "appointment", "actions"]),
	"unit-invoices": new Set(["lotBlock", "actions"]),
	"unit-productions": new Set(["select", "dueDate", "actions"]),
};

export const ROW_HEIGHTS: Record<TableId, number> = {
	"sales-orders": 48,
	"sales-quotes": 57,
	customers: 64,
	"sales-dispatch": 64,
	"inbound-management": 64,
	"sales-accounting": 64,
	"sales-statistics": 72,
	"inventory-products": 72,
	"inventory-categories": 64,
	"inventory-import": 72,
	"community-builders": 64,
	"community-templates": 72,
	"customer-service": 72,
	"unit-invoices": 72,
	"unit-productions": 72,
};

export const SUMMARY_GRID_HEIGHTS: Partial<Record<TableId, number>> = {
	"sales-orders": 180,
};

export const TABLE_CONFIGS: Record<TableId, TableConfig> = {
	"sales-orders": {
		tableId: "sales-orders",
		stickyColumns: STICKY_COLUMNS["sales-orders"],
		sortFieldMap: SORT_FIELD_MAPS["sales-orders"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["sales-orders"],
		rowHeight: ROW_HEIGHTS["sales-orders"],
		summaryGridHeight: SUMMARY_GRID_HEIGHTS["sales-orders"],
	},
	"sales-quotes": {
		tableId: "sales-quotes",
		stickyColumns: STICKY_COLUMNS["sales-quotes"],
		sortFieldMap: SORT_FIELD_MAPS["sales-quotes"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["sales-quotes"],
		rowHeight: ROW_HEIGHTS["sales-quotes"],
	},
	customers: {
		tableId: "customers",
		stickyColumns: STICKY_COLUMNS.customers,
		sortFieldMap: SORT_FIELD_MAPS.customers,
		nonReorderableColumns: NON_REORDERABLE_COLUMNS.customers,
		rowHeight: ROW_HEIGHTS.customers,
	},
	"sales-dispatch": {
		tableId: "sales-dispatch",
		stickyColumns: STICKY_COLUMNS["sales-dispatch"],
		sortFieldMap: SORT_FIELD_MAPS["sales-dispatch"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["sales-dispatch"],
		rowHeight: ROW_HEIGHTS["sales-dispatch"],
	},
	"inbound-management": {
		tableId: "inbound-management",
		stickyColumns: STICKY_COLUMNS["inbound-management"],
		sortFieldMap: SORT_FIELD_MAPS["inbound-management"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["inbound-management"],
		rowHeight: ROW_HEIGHTS["inbound-management"],
	},
	"sales-accounting": {
		tableId: "sales-accounting",
		stickyColumns: STICKY_COLUMNS["sales-accounting"],
		sortFieldMap: SORT_FIELD_MAPS["sales-accounting"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["sales-accounting"],
		rowHeight: ROW_HEIGHTS["sales-accounting"],
	},
	"sales-statistics": {
		tableId: "sales-statistics",
		stickyColumns: STICKY_COLUMNS["sales-statistics"],
		sortFieldMap: SORT_FIELD_MAPS["sales-statistics"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["sales-statistics"],
		rowHeight: ROW_HEIGHTS["sales-statistics"],
	},
	"inventory-products": {
		tableId: "inventory-products",
		stickyColumns: STICKY_COLUMNS["inventory-products"],
		sortFieldMap: SORT_FIELD_MAPS["inventory-products"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["inventory-products"],
		rowHeight: ROW_HEIGHTS["inventory-products"],
	},
	"inventory-categories": {
		tableId: "inventory-categories",
		stickyColumns: STICKY_COLUMNS["inventory-categories"],
		sortFieldMap: SORT_FIELD_MAPS["inventory-categories"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["inventory-categories"],
		rowHeight: ROW_HEIGHTS["inventory-categories"],
	},
	"inventory-import": {
		tableId: "inventory-import",
		stickyColumns: STICKY_COLUMNS["inventory-import"],
		sortFieldMap: SORT_FIELD_MAPS["inventory-import"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["inventory-import"],
		rowHeight: ROW_HEIGHTS["inventory-import"],
	},
	"community-builders": {
		tableId: "community-builders",
		stickyColumns: STICKY_COLUMNS["community-builders"],
		sortFieldMap: SORT_FIELD_MAPS["community-builders"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["community-builders"],
		rowHeight: ROW_HEIGHTS["community-builders"],
	},
	"community-templates": {
		tableId: "community-templates",
		stickyColumns: STICKY_COLUMNS["community-templates"],
		sortFieldMap: SORT_FIELD_MAPS["community-templates"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["community-templates"],
		rowHeight: ROW_HEIGHTS["community-templates"],
	},
	"customer-service": {
		tableId: "customer-service",
		stickyColumns: STICKY_COLUMNS["customer-service"],
		sortFieldMap: SORT_FIELD_MAPS["customer-service"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["customer-service"],
		rowHeight: ROW_HEIGHTS["customer-service"],
	},
	"unit-invoices": {
		tableId: "unit-invoices",
		stickyColumns: STICKY_COLUMNS["unit-invoices"],
		sortFieldMap: SORT_FIELD_MAPS["unit-invoices"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["unit-invoices"],
		rowHeight: ROW_HEIGHTS["unit-invoices"],
	},
	"unit-productions": {
		tableId: "unit-productions",
		stickyColumns: STICKY_COLUMNS["unit-productions"],
		sortFieldMap: SORT_FIELD_MAPS["unit-productions"],
		nonReorderableColumns: NON_REORDERABLE_COLUMNS["unit-productions"],
		rowHeight: ROW_HEIGHTS["unit-productions"],
	},
};

export function getTableConfig(tableId: TableId): TableConfig {
	return TABLE_CONFIGS[tableId];
}
