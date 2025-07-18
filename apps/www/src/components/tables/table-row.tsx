"use client";

import { flexRender, type Row } from "@tanstack/react-table";

import { cn } from "@gnd/ui/cn";
import { TableRow as BaseTableRow, TableCell } from "@gnd/ui/table";

import { useTable } from ".";
import { ColumnMeta } from "@/types/type";
import { useInfiniteDataTable } from "../(clean-code)/data-table/use-data-table";
import { TCell } from "../(clean-code)/data-table/table-cells";
import { Checkbox } from "@gnd/ui/checkbox";

type Props = {
    // row: Row<any>;
};

export function TableRow({}: Props) {
    const { table, tableMeta } = useTable();

    return (
        <>
            {table.getRowModel().rows.map((row, id) => (
                <BaseTableRow className={cn(tableMeta?.rowClassName)} key={id}>
                    <CheckboxRow row={row} />
                    {row.getVisibleCells().map((cell, index) => (
                        <TableCell
                            key={index}
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
function CheckboxRow({ row }) {
    const ctx = useTable();
    const { table } = ctx;
    if (!ctx.checkbox) return null;
    return (
        <TCell align="center" className="w-10 px-2">
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => {
                    const val = !!value;

                    row.toggleSelected(val);
                }}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        </TCell>
    );
}
