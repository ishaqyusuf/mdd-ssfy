import { Fragment, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Env } from "@/components/env";
import { __revalidatePath } from "@/app/(v1)/_actions/_revalidate";
import { DataTablePagination } from "@/components/common/data-table/data-table-pagination";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ColumnDef, flexRender } from "@tanstack/react-table";
import { LoaderCircle } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { BatchAction } from "./infinity/batch-action";
import { cellVariants, TableCellProps, TCell } from "./table-cells";
import {
    dataTableContext,
    TableRowModel,
    useDataTable,
    useDataTableContext,
    useInfiniteDataTable,
} from "./use-data-table";
import { useInfiniteDataTableContext } from "./use-infinity-data-table";
import { TableProps } from "./use-table-compose";

interface BaseProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    pageCount?: number;
    children?;
    cellVariants?: TableCellProps;
    addFilterCol?(col: String);
    schema;
    filterFields;
}
function BaseDataTable<TData, TValue>({
    children,
    ...props
}: // data,
// pageCount,
// columns,
// cellVariants,
// addFilterCol,
BaseProps<TData, TValue>) {
    const ctx = useDataTable(props as any);

    return (
        <dataTableContext.Provider value={ctx}>
            <div className="w-full space-y-3 overflow-auto">{children}</div>
        </dataTableContext.Provider>
    );
}
function Header({
    className,
    children,
    top = "sm",
}: {
    className?;
    children;
    top?: "sm" | "md" | "lg" | "xs";
}) {
    const ctx = useInfiniteDataTable();
    return (
        <div
            className={cn(
                "sm:px-8s sticky  z-10 p-4",
                top == "xs" && "top-[50px]",
                top == "md" && "top-[60px]",
                top == "sm" && "top-[60px]",
                top == "lg" && "top-24",
                "flex flex-col",
                className,
            )}
            ref={ctx.topBarRef}
        >
            {children}
        </div>
    );
}
export type InfiniteDataTablePageProps = {
    filterFields;
    queryKey;
    queryParams?;
};
function Infinity({
    children,
    ...props
}: { children; queryKey; itemViewFn? } & TableProps) {
    const ctx = useInfiniteDataTableContext(props);

    return (
        <dataTableContext.Provider value={ctx}>
            <div
                // className="w-full space-y-3 overflow-auto min-h-[80vh]"
                className="ssm:border-l flex max-w-full flex-1 flex-col overflow-clip border-border"
            >
                {children}
            </div>
        </dataTableContext.Provider>
    );
}
function ActionHeader({}) {
    const ctx = useInfiniteDataTable();
    if (!ctx.ActionCell) return null;
    return <TableHead className="w-12s px-2" align="right"></TableHead>;
}
function CheckboxHeader({}) {
    const ctx = useInfiniteDataTable();
    const { table } = ctx;
    if (!ctx.checkable) return null;
    return (
        <TableHead className={cn(cellVariants(ctx.cellVariants), "w-10")}>
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => {
                    const val = !!value;
                    ctx.setCheckMode(val);
                    table.toggleAllPageRowsSelected(val);
                }}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        </TableHead>
    );
}
function CheckboxRow({ row }) {
    const ctx = useInfiniteDataTable();
    const { table } = ctx;
    if (!ctx.checkable) return null;
    return (
        <TCell align="center" className="w-10 px-2">
            <Checkbox
                checked={ctx.checkMode && row.getIsSelected()}
                onCheckedChange={(value) => {
                    const val = !!value;
                    if (val) ctx.setCheckMode(val);
                    row.toggleSelected(val);
                }}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        </TCell>
    );
}
function _Table({}) {
    const { table, columns, ...ctx } = useInfiniteDataTable();

    return (
        <div className="z-0 max-md:w-[100vw] max-md:overflow-auto">
            <Table
            // containerClassName={
            //     // ctx.topBarHeight ? "w-full md:overflow-clip" : ""
            // }
            >
                <TableHeader
                    className={
                        cn("bg-muted")
                        // ctx.topBarHeight ? "z-10 bg-muted md:sticky" : "",
                    }
                    // style={{ top: `${ctx.topBarHeight}px` }}
                >
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            <CheckboxHeader />
                            {headerGroup.headers.map((header, index) => {
                                if (!header.id.includes("__"))
                                    return (
                                        <TableHead
                                            className={cn(
                                                cellVariants(ctx.cellVariants),
                                                "whitespace-nowrap",
                                            )}
                                            key={`${header.id}_${index}`}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    );
                            })}
                            <ActionHeader />
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table
                            .getRowModel()
                            .rows.map((row, index) => (
                                <Tr
                                    rowIndex={index}
                                    key={`${row.id}-${index}`}
                                    row={row}
                                />
                            ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center"
                            >
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
interface TrProps {
    rowIndex;
    row: TableRowModel;
}
function Tr({ row, rowIndex }: TrProps) {
    const ctx = useInfiniteDataTable();
    return (
        <TableRow
            className={cn("")}
            onClick={() => row.toggleSelected()}
            data-state={row.getIsSelected() && "selected"}
        >
            <CheckboxRow row={row} />
            {row
                .getVisibleCells()
                .map((cell, index) =>
                    cell.id.includes("__") ? null : (
                        <Fragment key={`${cell.id}_cell_${index}`}>
                            {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                            )}
                        </Fragment>
                    ),
                )
                .filter(Boolean)}
            {ctx.ActionCell && (
                <TCell align="right">
                    <div className="flex justify-end gap-2 lg:gap-4">
                        <ctx.ActionCell
                            item={row.original}
                            itemIndex={rowIndex}
                        />
                    </div>
                </TCell>
            )}
        </TableRow>
    );
}
function Footer() {
    const { table, columns } = useDataTableContext();
    return <DataTablePagination table={table} />;
}
function LoadMore() {
    const {
        table,
        columns,
        totalRowsFetched,
        filterRows,
        isFetching,
        totalRows,
        fetchNextPage,
        isLoading,
    } = useInfiniteDataTable();
    return (
        <div className="flex justify-center">
            {totalRows > totalRowsFetched ||
            !table.getCoreRowModel().rows?.length ? (
                <Button
                    disabled={isFetching || isLoading}
                    onClick={() => fetchNextPage()}
                    size="sm"
                    variant="outline"
                >
                    {isFetching ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Load More
                </Button>
            ) : (
                <p className="text-sm text-muted-foreground">
                    No more data to load (total:{" "}
                    <span className="font-mono font-medium">
                        {formatCompactNumber(totalRows)}
                    </span>{" "}
                    rows)
                </p>
            )}
        </div>
    );
}
export let DataTable = Object.assign(BaseDataTable, {
    Table: _Table,
    Footer,
    Infinity,
    LoadMore,
    Header,
    BatchAction,
});
