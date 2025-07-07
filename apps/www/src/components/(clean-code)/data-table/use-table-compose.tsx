import React, { useState } from "react";
import { TableCellProps } from "./table-cells";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./data-table-column-header";
import { SearchParamsKeys } from "./search-params";

interface ColumnArgs {
    noTitle?: boolean;
}
type CtxType<T> = {
    // PrimaryColumn(title, value: CellValueType<T>): ColumnDef<T, unknown>;
    Column(
        title?: string,
        key?: string,
        Column?: (
            { item }: { item: T },
            args: ColumnArgs
        ) => React.ReactElement,
        args?: ColumnArgs
    );
    ActionCell(Column: ({ item }: { item: T }) => React.ReactElement);
    // Primary({ children });
    // Secondary({ children });
    // queryFields(...ids);
};
interface Props<T> {
    deleteAction?;
    sn?: boolean;
    snId?: string;
    snIdFn?(item: T);
    snDate?: string;
    snTitle?: string;
    checkable?: boolean;
    filterCells?: SearchParamsKeys[];
    pageCount?;
    cellVariants?: TableCellProps;
    v2?: boolean;
    cells: (ctx: CtxType<T>) => ColumnDef<T, unknown>[];
    filterFields;
    serverAction?;
    passThroughProps?: {
        itemClick?(item);
    };
}
export type TableProps = ReturnType<typeof useTableCompose>["props"] & {
    defaultRowSelection?;
    checkable?: boolean;
    ActionCell?;
};
export function useTableCompose<T>(props: Props<T>) {
    const [dynamicCols, setDynamicCols] = useState([]);
    const [isPending, startTransition] = React.useTransition();
    const ctx: CtxType<T> = {
        Column(title, key, Column, args?: ColumnArgs) {
            return {
                accessorKey: key,
                // key,
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        title={args?.noTitle ? "" : title}
                    />
                ),
                cell: ({ cell }) =>
                    Column ? <Column item={cell.row.original} /> : null,
            };
        },
        ActionCell(Column: ({ item }: { item: T }) => React.ReactElement) {
            return {
                id: "action",
                cell: ({ cell }) => <Column item={cell.row.original} />,
            };
        },
    };
    const columns = React.useMemo<ColumnDef<T, unknown>[]>(
        () =>
            [
                // checkable && checkBox.column,
                // props?.sn && SnCol,
                ...props.cells(ctx),
                ...([
                    ...(props?.filterCells || []),
                    ...(dynamicCols || []),
                ]?.map((fs) => {
                    return {
                        accessorKey: fs,
                        enableHiding: false,
                    };
                }) as any),
            ].filter(Boolean) as any,
        [isPending, dynamicCols]
    );
    function addFilterCol(col) {
        setDynamicCols((current) => {
            let s = [...current, col];
            let cells = [...new Set(s)];
            return cells;
        });
    }
    return {
        props: {
            columns,
            // data,
            pageCount: props?.pageCount,
            cellVariants: props.cellVariants,
            addFilterCol,

            filterFields: props.filterFields,
            serverAction: props.serverAction,
            ...props.passThroughProps,
        },
    };
}
