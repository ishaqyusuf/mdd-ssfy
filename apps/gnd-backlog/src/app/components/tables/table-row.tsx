"use client";

import { flexRender, type Row } from "@tanstack/react-table";

import { cn } from "@gnd/ui/cn";
import { TableRow as BaseTableRow, TableCell } from "@gnd/ui/table";

import { useTable } from ".";
import { ColumnMeta } from "@/types/type";

type Props = {
    // row: Row<any>;
};

export function TableRow({}: Props) {
    const { table, tableMeta } = useTable();

    return (
        <>
            {table.getRowModel().rows.map((row) => (
                <BaseTableRow className={cn()} key={row.id}>
                    {row.getVisibleCells().map((cell, index) => (
                        <TableCell
                            key={cell.id}
                            onClick={(e) => {
                                const meta = cell.column.columnDef
                                    .meta as ColumnMeta;
                                if (
                                    cell.column.id == "actions" ||
                                    meta?.preventDefault
                                )
                                    return;
                                tableMeta?.rowClick?.(
                                    row.original?.id,
                                    row.original,
                                );
                            }}
                            className={cn(
                                (cell.column.columnDef.meta as any)?.className,
                                tableMeta?.rowClick &&
                                    "cursor-pointer hover:bg-transparent",
                            )}
                        >
                            {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                            )}
                        </TableCell>
                    ))}
                </BaseTableRow>
            ))}
        </>
    );
}
