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
};

export const NON_REORDERABLE_COLUMNS: Record<TableId, Set<string>> = {
    "sales-orders": new Set(["select", "orderId", "actions"]),
};

export const ROW_HEIGHTS: Record<TableId, number> = {
    "sales-orders": 57,
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
};

export function getTableConfig(tableId: TableId): TableConfig {
    return TABLE_CONFIGS[tableId];
}
