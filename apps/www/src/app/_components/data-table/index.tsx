import { Fragment } from "react";
import { DataTablePagination } from "@/components/common/data-table/data-table-pagination";
import { cn } from "@/lib/utils";
import { ColumnDef, flexRender } from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { TableCellProps } from "./table-cells";
import {
    dataTableContext,
    TableRowModel,
    useDataTable,
    useDataTableContext,
} from "./use-data-table";

interface BaseProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    pageCount?: number;
    children?;
    cellVariants?: TableCellProps;
    addFilterCol?(col: String);
}
function BaseDataTable<TData, TValue>({
    children,
    data,
    pageCount,
    columns,
    cellVariants,
    addFilterCol,
}: BaseProps<TData, TValue>) {
    const ctx = useDataTable(
        data,
        columns,
        pageCount,
        cellVariants,
        addFilterCol,
    );

    return (
        <dataTableContext.Provider value={ctx}>
            <div className="w-full space-y-3 overflow-auto">{children}</div>
        </dataTableContext.Provider>
    );
}
function _Table({}) {
    const { table, columns } = useDataTableContext();
    return (
        <div className="sm:rounded-lg sm:border">
            <Table>
                <TableHeader className={cn("")}>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                if (!header.id.includes("_"))
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className="whitespace-nowrap"
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
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table
                            .getRowModel()
                            .rows.map((row) => <Tr key={row.id} row={row} />)
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
    row: TableRowModel;
}
function Tr({ row }: TrProps) {
    return (
        <TableRow
            className={cn("")}
            key={row.id}
            data-state={row.getIsSelected() && "selected"}
        >
            {row
                .getVisibleCells()
                .map((cell) =>
                    cell.id.includes("__") ? null : (
                        <Fragment key={cell.id}>
                            {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                            )}
                        </Fragment>
                    ),
                )
                .filter(Boolean)}
        </TableRow>
    );
}
function Footer() {
    const { table, columns } = useDataTableContext();
    return <DataTablePagination table={table} />;
}
export let DataTable = Object.assign(BaseDataTable, {
    Table: _Table,
    Footer,
});
