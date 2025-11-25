import { cva } from "class-variance-authority";

import { useTable } from ".";
import {
  TableHead,
  TableHeader as BaseTableHeader,
  TableRow,
} from "../../table";
import { cn } from "../../../utils";
import { Checkbox } from "../../checkbox";
import { useStickyColumns } from "../../../hooks/use-sticky-columns";
import { Button } from "../../button";
import { ArrowDown, ArrowUp } from "lucide-react";

const tableHeaderVariants = cva("", {
  variants: {},
  defaultVariants: {},
});
export function TableHeader({}) {
  const { table, tableScroll, setParams, params: { sort } = {} } = useTable();
  const { getStickyStyle, isVisible } = useStickyColumns({
    table,
    loading: false,
  });
  const [column, value] = sort || [];

  const createSortQuery = (name: string) => {
    // const [currentColumn, currentValue] = sort?.[0]?.split(".") || [];
    const currentValue = sortedDir(name);
    let newSort = [...(sort || [])];
    const __setParams = ({ sort: _sort }) => {
      if (!_sort) newSort = newSort.filter((s) => !s.startsWith(`${name}.`));
      else {
        newSort.push(_sort);
      }
    };
    // if (name === currentColumn) {
    if (currentValue === "asc") {
      __setParams({ sort: [name, "desc"]?.join(".") });
    } else if (currentValue === "desc") {
      __setParams({ sort: null });
    } else {
      __setParams({ sort: [name, "asc"]?.join(".") });
    }
    // console.log(newSort);
    const revSort = JSON.parse(JSON.stringify(newSort)).reverse();
    const ns = !newSort?.length
      ? null
      : newSort.filter(
          (a, i) =>
            revSort.find((b) => b.startsWith(a.split(".")[0] + ".")) === a
        );
    setParams({
      sort: ns,
    });
    // } else {
    // setParams({ sort: [name, "asc"]?.join(".") });
    // }
  };
  const sortedDir = (columnName: string) => {
    const [_, dir] =
      sort?.find((s) => s.startsWith(`${columnName}.`))?.split(".") || [];
    return dir as "asc" | "desc" | null;
  };
  return (
    <BaseTableHeader className={cn("border-l-0 border-r-0 bg-muted")}>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          key={headerGroup.id}
          className="h-[45px] hover:bg-transparent"
        >
          {headerGroup.headers.map((header, index) => {
            const sortDir = sortedDir(header.id);

            if (header.id === "select")
              return (
                <CheckboxHeader key={index} style={getStickyStyle(header.id)} />
              );
            if (!header.id.includes("__"))
              return (
                <TableHead
                  className={cn(
                    "whitespace-nowrap",
                    (header.column.columnDef.meta as any)?.className,
                    (header.column.columnDef.meta as any)?.className,
                    (header.column.columnDef.meta as any)?.actionCell &&
                      "w-[100px] md:sticky md:right-0 z-30",
                    "h-10 uppercase",
                    index == 0 && ""
                  )}
                  key={`${header.id}_${index}`}
                >
                  <div className="flex items-center justify-between">
                    {
                      header.isPlaceholder ? null : (
                        <Button
                          className={cn(
                            "p-0 hover:bg-transparent space-x-2",
                            !header?.column?.columnDef?.meta?.sortable &&
                              "cursor-default"
                          )}
                          variant="ghost"
                          onClick={
                            !header?.column?.columnDef?.meta?.sortable
                              ? undefined
                              : () => createSortQuery(String(header.id))
                          }
                        >
                          <span>{header?.column?.columnDef?.header}</span>
                          {sortDir === "asc" && <ArrowDown size={16} />}
                          {sortDir === "desc" && <ArrowUp size={16} />}
                        </Button>
                      )
                      // flexRender(
                      //     header.column.columnDef.header,
                      //     header.getContext()
                      //   )
                    }
                  </div>
                </TableHead>
              );
          })}
        </TableRow>
      ))}
    </BaseTableHeader>
  );
}
function CheckboxHeader({ style = undefined }) {
  const ctx = useTable();
  const { table, checkbox } = ctx;
  if (!checkbox) return null;
  return (
    <TableHead
      style={style}
      className={cn(
        "w-[50px] min-w-[50px] px-3 md:px-4 py-2 md:sticky md:left-0 bg-background z-20 border-r border-border before:absolute before:right-0 before:top-0 before:bottom-0 before:w-px before:bg-border after:absolute after:right-[-24px] after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-l after:from-transparent after:to-background after:z-[-1]"
      )}
    >
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => {
          const val = !!value;
          table.toggleAllPageRowsSelected(val);
        }}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    </TableHead>
  );
}
