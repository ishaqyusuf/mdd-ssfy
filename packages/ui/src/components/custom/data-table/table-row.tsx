"use client";

import { flexRender } from "@tanstack/react-table";

import { cn } from "../../../utils";
import { TableRow as BaseTableRow, TableCell } from "../../table";

import { useTable } from ".";
import { Checkbox } from "../../checkbox";
import { useStickyColumns } from "../../../hooks/use-sticky-columns";

type Props = {
  // row: Row<any>;
};

export function TableRow({}: Props) {
  const { table, tableMeta } = useTable();
  const { getStickyStyle, isVisible } = useStickyColumns({
    table,
    loading: false,
  });
  return (
    <>
      {table.getRowModel().rows.map((row, id) => (
        <BaseTableRow
          className={cn(
            "group h-[40px] md:h-[45px] cursor-pointer select-text hover:bg-[#F2F1EF] hover:dark:bg-secondary",
            tableMeta?.rowClassName
          )}
          key={id}
        >
          {/* <CheckboxRow style={getStickyStyle('checkbox')} row={row} /> */}
          {row.getVisibleCells().map((cell, index) => (
            <TableCell
              key={index}
              style={getStickyStyle(cell.column.id)}
              onClick={(e) => {
                const meta = cell.column.columnDef.meta as any; // ColumnMeta;
                if (
                  cell.column.id == "actions" ||
                  cell.column.id === "select" ||
                  meta?.preventDefault
                )
                  return;
                tableMeta?.rowClick?.(row.original?.id, row.original);
              }}
              className={cn(
                (cell.column.columnDef.meta as any)?.className,
                tableMeta?.rowClick && "cursor-pointer hover:bg-transparent",
                ""
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
    <TableCell align="center" className="py-0">
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          const val = !!value;

          row.toggleSelected(val);
        }}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    </TableCell>
  );
}
