"use client";

import { flexRender } from "@tanstack/react-table";

import { useTable } from ".";
import { useStickyColumns } from "../../../hooks/use-sticky-columns";
import { cn } from "../../../utils";
import { PaginationOverlay } from "./pagination-overlay";
import { Checkbox } from "../../checkbox";
import { TableRow as BaseTableRow, TableCell } from "../../table";

type CellMeta = {
  className?: string;
  preventDefault?: boolean;
};

export function TableRow() {
  const { table, tableMeta, mobileMode, usingMobileColumn, pagination } =
    useTable();
  const { getStickyStyle } = useStickyColumns({
    table,
    loading: false,
  });
  return (
    <>
      <PaginationOverlay />
      {table.getRowModel().rows.map((row, rowIndex) => (
        <BaseTableRow
          data-page-index={
            Math.floor(rowIndex / (pagination?.pageSize || 1)) + 1
          }
          data-row-id={row.id}
          data-row-index={rowIndex}
          className={cn(
            "group h-10 md:h-11.25 cursor-pointer select-text hover:bg-[#F2F1EF] hover:dark:bg-secondary",
            // mobileMode?.borderless &&
            "max-md:border-y-0 max-md:hover:bg-transparent",
            tableMeta?.rowClassName,
          )}
          key={row.id}
          ref={pagination?.registerRow?.(rowIndex)}
        >
          {/* <CheckboxRow style={getStickyStyle('checkbox')} row={row} /> */}
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              style={getStickyStyle(cell.column.id)}
              onClick={() => {
                const meta = cell.column.columnDef.meta as CellMeta | undefined;
                if (
                  // usingMobileColumn ||
                  cell.column.id === "actions" ||
                  cell.column.id === "select" ||
                  meta?.preventDefault
                )
                  return;
                tableMeta?.rowClick?.(row.original?.id, row.original);
              }}
              className={cn(
                (cell.column.columnDef.meta as CellMeta | undefined)?.className,
                tableMeta?.rowClick &&
                  !usingMobileColumn &&
                  "cursor-pointer hover:bg-transparent",
                mobileMode?.borderless && "border-0",
                "",
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
