import type {
    ColumnDef,
    ColumnOrderState,
    ColumnSizingState,
    VisibilityState,
} from "@tanstack/react-table";

export type TableId = "sales-orders";

export interface TableSettings {
    columns: VisibilityState;
    sizing: ColumnSizingState;
    order: ColumnOrderState;
    showColumnDividers?: boolean;
}

export type AllTableSettings = {
    [K in TableId]?: Partial<TableSettings>;
};

export const TABLE_SETTINGS_COOKIE = "gnd-table-settings";

export const defaultHiddenColumns: Record<TableId, string[]> = {
    "sales-orders": [
        "amountDue",
        "productionLabel",
        "fulfillmentLabel",
        "salesRepName",
    ],
};

export function getDefaultColumnVisibility(tableId: TableId): VisibilityState {
    return defaultHiddenColumns[tableId].reduce(
        (acc, columnId) => {
            acc[columnId] = false;
            return acc;
        },
        {} as Record<string, boolean>,
    );
}

export function getDefaultTableSettings(tableId: TableId): TableSettings {
    return {
        columns: getDefaultColumnVisibility(tableId),
        sizing: {},
        order: [],
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
    };
}

export function getColumnIds<TData>(columns: ColumnDef<TData>[]): string[] {
    return columns
        .map(
            (column) =>
                column.id ??
                (column as ColumnDef<TData> & { accessorKey?: string })
                    .accessorKey ??
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
