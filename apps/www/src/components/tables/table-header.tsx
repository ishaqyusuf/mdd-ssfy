import { flexRender } from "@tanstack/react-table";
import { cva, type VariantProps } from "class-variance-authority";

import { useTable } from ".";
import { TableHead, TableHeader, TableRow } from "@gnd/ui/table";
import { cn } from "@gnd/ui/cn";
import { useInfiniteDataTable } from "../(clean-code)/data-table/use-data-table";
import { cellVariants } from "../(clean-code)/data-table/table-cells";
import { Checkbox } from "@gnd/ui/checkbox";
import { useStickyColumns } from "@gnd/ui/hooks/use-sticky-columns";
const tableHeaderVariants = cva("", {
    variants: {},
    defaultVariants: {},
});
export function TableHeaderComponent({}) {
    const { table, tableScroll, setParams, params: { sort } = {} } = useTable();
    const { getStickyStyle, isVisible } = useStickyColumns({
        table,
        loading: false,
    });
    const [column, value] = sort || [];

    const createSortQuery = (name: string) => {
        const [currentColumn, currentValue] = sort || [];

        if (name === currentColumn) {
            if (currentValue === "asc") {
                setParams({ sort: [name, "desc"] });
            } else if (currentValue === "desc") {
                setParams({ sort: null });
            } else {
                setParams({ sort: [name, "asc"] });
            }
        } else {
            setParams({ sort: [name, "asc"] });
        }
    };
    return (
        <TableHeader className={cn("border-l-0 border-r-0 ")}>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                    key={headerGroup.id}
                    className="h-[45px] hover:bg-transparent"
                >
                    <CheckboxHeader style={getStickyStyle("select")} />
                    {headerGroup.headers.map((header, index) => {
                        if (!header.id.includes("__"))
                            return (
                                <TableHead
                                    className={cn(
                                        "whitespace-nowrap",
                                        (header.column.columnDef.meta as any)
                                            ?.className,
                                        (header.column.columnDef.meta as any)
                                            ?.className,
                                        "h-10 uppercase",
                                        index == 0 && "",
                                    )}
                                    key={`${header.id}_${index}`}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          )}
                                </TableHead>
                            );
                    })}
                </TableRow>
            ))}
        </TableHeader>
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
                "w-[50px] min-w-[50px] px-3 md:px-4 py-2 md:sticky md:left-0 bg-background z-20 border-r border-border before:absolute before:right-0 before:top-0 before:bottom-0 before:w-px before:bg-border after:absolute after:right-[-24px] after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-l after:from-transparent after:to-background after:z-[-1]",
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
