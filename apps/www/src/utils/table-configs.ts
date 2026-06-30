import type {
	StickyColumnConfig,
	TableConfig,
} from "@/components/tables-2/core";
import { sizes } from "@/components/tables-2/core/table-sizes";
import type { TableId } from "@/utils/table-settings";

export const TABLE_CONFIGS: Record<TableId, TableConfig> = {
	"sales-orders": {
		tableId: "sales-orders",
		stickyColumns: [
			{ id: "select", width: sizes.custom(50, 50).size },
			{ id: "orderId", width: sizes.custom(150, 280, 180).size },
		],
		sortFieldMap: {
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
		nonReorderableColumns: new Set(["select", "orderId", "actions"]),
		rowHeight: 40,
		headerHeight: 45,
		style: "compact",
		summaryGridHeight: 180,
	},
	"sales-quotes": {
		tableId: "sales-quotes",
		stickyColumns: [
			{ id: "select", width: sizes.custom(50, 50).size },
			{ id: "orderId", width: sizes.custom(150, 280, 180).size },
		],
		sortFieldMap: {
			orderId: "orderId",
			salesDate: "createdAt",
			invoiceTotal: "grandTotal",
		},
		nonReorderableColumns: new Set(["select", "orderId", "actions"]),
		rowHeight: 40,
		headerHeight: 45,
		style: "compact",
	},
	customers: {
		tableId: "customers",
		stickyColumns: [
			{ id: "customer", width: sizes.custom(220, 440, 300).size },
		],
		sortFieldMap: {
			customer: "name",
			phoneNo: "phoneNo",
			email: "email",
			address: "address",
		},
		nonReorderableColumns: new Set(["customer", "actions"]),
		rowHeight: 64,
		headerHeight: 45,
		style: "compact",
	},
	"sales-dispatch": {
		tableId: "sales-dispatch",
		stickyColumns: [
			{ id: "select", width: sizes.custom(50, 50).size },
			{ id: "orderId", width: sizes.custom(150, 260, 180).size },
		],
		sortFieldMap: {
			orderId: "orderId",
			dueDate: "dueDate",
			orderDate: "createdAt",
			status: "status",
			assignedTo: "driverId",
		},
		nonReorderableColumns: new Set(["select", "orderId", "actions"]),
		rowHeight: 64,
		headerHeight: 45,
		style: "compact",
	},
	"inbound-management": {
		tableId: "inbound-management",
		stickyColumns: [{ id: "orderId", width: sizes.custom(150, 240, 180).size }],
		sortFieldMap: {},
		nonReorderableColumns: new Set(["orderId", "actions"]),
		rowHeight: 64,
		headerHeight: 45,
		style: "compact",
	},
	"sales-accounting": {
		tableId: "sales-accounting",
		stickyColumns: [
			{ id: "select", width: sizes.custom(50, 50).size },
			{ id: "createdAt", width: sizes.custom(130, 210, 150).size },
		],
		sortFieldMap: {},
		nonReorderableColumns: new Set(["select", "createdAt", "actions"]),
		rowHeight: 64,
		headerHeight: 45,
		style: "compact",
	},
	"sales-statistics": {
		tableId: "sales-statistics",
		stickyColumns: [
			{ id: "productName", width: sizes.custom(260, 520, 320).size },
		],
		sortFieldMap: {},
		nonReorderableColumns: new Set(["productName"]),
		rowHeight: 72,
		headerHeight: 45,
		style: "compact",
	},
	"inventory-products": {
		tableId: "inventory-products",
		stickyColumns: [
			{ id: "select", width: sizes.custom(50, 50).size },
			{ id: "product", width: sizes.custom(260, 520, 320).size },
		],
		sortFieldMap: {},
		nonReorderableColumns: new Set(["select", "product", "actions"]),
		rowHeight: 72,
		headerHeight: 45,
		style: "compact",
	},
	"inventory-categories": {
		tableId: "inventory-categories",
		stickyColumns: [
			{ id: "select", width: sizes.custom(50, 50).size },
			{ id: "category", width: sizes.custom(260, 520, 320).size },
		],
		sortFieldMap: {},
		nonReorderableColumns: new Set(["select", "category", "actions"]),
		rowHeight: 64,
		headerHeight: 45,
		style: "compact",
	},
	"inventory-import": {
		tableId: "inventory-import",
		stickyColumns: [
			{ id: "category", width: sizes.custom(260, 540, 340).size },
		],
		sortFieldMap: {},
		nonReorderableColumns: new Set(["category"]),
		rowHeight: 72,
		headerHeight: 45,
		style: "compact",
	},
	"community-builders": {
		tableId: "community-builders",
		stickyColumns: [{ id: "builder", width: sizes.custom(240, 480, 340).size }],
		sortFieldMap: {
			builder: "name",
		},
		nonReorderableColumns: new Set(["builder", "actions"]),
		rowHeight: 64,
		headerHeight: 45,
		style: "compact",
	},
	"community-templates": {
		tableId: "community-templates",
		stickyColumns: [{ id: "model", width: sizes.custom(240, 440, 320).size }],
		sortFieldMap: {
			model: "modelName",
		},
		nonReorderableColumns: new Set(["model", "actions"]),
		rowHeight: 72,
		headerHeight: 45,
		style: "compact",
	},
	"customer-service": {
		tableId: "customer-service",
		stickyColumns: [
			{ id: "select", width: sizes.custom(50, 50).size },
			{ id: "appointment", width: sizes.custom(150, 240, 180).size },
		],
		sortFieldMap: {
			appointment: "scheduleDate",
			customer: "homeOwner",
			status: "status",
		},
		nonReorderableColumns: new Set(["select", "appointment", "actions"]),
		rowHeight: 72,
		headerHeight: 45,
		style: "compact",
	},
	"unit-invoices": {
		tableId: "unit-invoices",
		stickyColumns: [
			{ id: "lotBlock", width: sizes.custom(220, 380, 280).size },
		],
		sortFieldMap: {
			lotBlock: "lotBlock",
			project: "project",
			date: "date",
		},
		nonReorderableColumns: new Set(["lotBlock", "actions"]),
		rowHeight: 72,
		headerHeight: 45,
		style: "compact",
	},
	"unit-productions": {
		tableId: "unit-productions",
		stickyColumns: [
			{ id: "select", width: sizes.custom(50, 50).size },
			{ id: "dueDate", width: sizes.custom(150, 220, 170).size },
		],
		sortFieldMap: {
			dueDate: "dueDate",
			task: "task",
			unit: "unit",
			project: "project",
		},
		nonReorderableColumns: new Set(["select", "dueDate", "actions"]),
		rowHeight: 72,
		headerHeight: 45,
		style: "compact",
	},
};

export function getTableConfig(tableId: TableId) {
	return TABLE_CONFIGS[tableId];
}

export const STICKY_COLUMNS = Object.fromEntries(
	Object.entries(TABLE_CONFIGS).map(([tableId, config]) => [
		tableId,
		config.stickyColumns,
	]),
) as Record<TableId, StickyColumnConfig[]>;

export const SORT_FIELD_MAPS = Object.fromEntries(
	Object.entries(TABLE_CONFIGS).map(([tableId, config]) => [
		tableId,
		config.sortFieldMap,
	]),
) as Record<TableId, Record<string, string>>;

export const NON_REORDERABLE_COLUMNS = Object.fromEntries(
	Object.entries(TABLE_CONFIGS).map(([tableId, config]) => [
		tableId,
		config.nonReorderableColumns,
	]),
) as Record<TableId, Set<string>>;

export const ROW_HEIGHTS = Object.fromEntries(
	Object.entries(TABLE_CONFIGS).map(([tableId, config]) => [
		tableId,
		config.rowHeight,
	]),
) as Record<TableId, number>;

export const SUMMARY_GRID_HEIGHTS = Object.fromEntries(
	Object.entries(TABLE_CONFIGS)
		.filter(([, config]) => config.summaryGridHeight !== undefined)
		.map(([tableId, config]) => [tableId, config.summaryGridHeight]),
) as Partial<Record<TableId, number>>;
