import { flexRender } from "@tanstack/react-table";
import { cva, type VariantProps } from "class-variance-authority";

import { useTable } from ".";
import { TableHead, TableHeader, TableRow } from "@gnd/ui/table";
import { cn } from "@gnd/ui/cn";
import { useInfiniteDataTable } from "../(clean-code)/data-table/use-data-table";
import { cellVariants } from "../(clean-code)/data-table/table-cells";
import { Checkbox } from "@gnd/ui/checkbox";

const tableHeaderVariants = cva("", {
    variants: {},
    defaultVariants: {},
});
export function TableHeaderComponent({}) {
    const { table, setParams, params: { sort } = {} } = useTable();

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
        <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="">
                    <CheckboxHeader />
                    {headerGroup.headers.map((header, index) => {
                        if (!header.id.includes("__"))
                            return (
                                <TableHead
                                    className={cn(
                                        "whitespace-nowrap",
                                        (header.column.columnDef.meta as any)
                                            ?.className,
                                        "h-10 uppercase",
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
function CheckboxHeader({}) {
    const ctx = useTable();
    const { table, checkbox } = ctx;
    if (!checkbox) return null;
    return (
        <TableHead className={cn("w-10")}>
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
