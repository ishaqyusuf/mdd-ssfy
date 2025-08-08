"use client";

import { columns } from "@/components/tables/sales-orders/columns";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { TableHead, TableHeader, TableRow } from "@gnd/ui/table";

export function SalesTableHeader({}) {
    //   const { setParams, sort } = useInvoiceParams({ shallow: false });
    let sort;
    let setParams = (obj) => {};
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
            <TableRow>
                {columns.map((column, cid) => (
                    <TableHead
                        key={cid}
                        className={cn(
                            column.id == "orderNo" && "hidden md:table-cell",
                        )}
                    >
                        <Button
                            className="space-x-2 p-0 hover:bg-transparent"
                            variant="ghost"
                            onClick={() => createSortQuery("invoice_number")}
                        >
                            {/* <span>{column.header}</span> */}
                            {"invoice_number" === column.id &&
                                value === "asc" && <ArrowDown size={16} />}
                            {"invoice_number" === column.id &&
                                value === "desc" && <ArrowUp size={16} />}
                        </Button>
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
    );
}
