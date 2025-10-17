"use client";

import { GetSalesListDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { flexRender } from "@tanstack/react-table";

import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";
import { TableCell, TableRow } from "@gnd/ui/table";

export function SalesRowSkeleton() {
    return (
        <li className="flex h-[57px] w-full items-center">
            <div className="flex w-full items-center">
                <div className="flex w-1/4 flex-col space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                </div>

                <div className="w-1/4">
                    <Skeleton className="h-5 w-16" />
                </div>

                <div className="w-1/4">
                    <Skeleton className="h-4 w-24" />
                </div>

                <div className="flex w-1/4 justify-end">
                    <Skeleton className="h-4 w-16" />
                </div>
            </div>
        </li>
    );
}
export function SalesTableRow({ row }) {
    const overviewQuery = useSalesOverviewQuery();
    return (
        <>
            <TableRow
                className="h-[57px] cursor-pointer hover:bg-transparent"
                onClick={(e) => {
                    overviewQuery?.open2(row?.original?.uuid, "sales");
                }}
            >
                {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                        key={index}
                        className={cn(
                            index === 2 && "w-[50px]",
                            (cell.column.id === "actions" ||
                                cell.column.id === "recurring" ||
                                cell.column.id === "invoice_number" ||
                                cell.column.id === "issue_date") &&
                                "hidden md:table-cell",
                        )}
                        // onClick={() =>
                        //   index !== row.getVisibleCells().length - 1 && setOpen(row.id)
                        // }
                    >
                        {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                        )}
                    </TableCell>
                ))}
            </TableRow>
        </>
    );
}
export function SalesRow({ sale }: { sale: GetSalesListDta["data"][number] }) {
    return (
        <li className="flex h-[57px] w-full items-center">
            <div className="flex w-full items-center">
                {/* Date */}
                <div className="flex w-1/4 flex-col space-y-1">
                    <span className="text-sm">
                        {sale.createdAt
                            ? new Date(sale.createdAt).toLocaleDateString()
                            : "-"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {sale.createdAt
                            ? new Date(sale.createdAt).toLocaleTimeString()
                            : "-"}
                    </span>
                </div>

                {/* Status */}
                <div className="w-1/4">
                    <Badge
                        variant={
                            sale.status === "Completed" ? "success" : "outline"
                        }
                        className="text-xs"
                    >
                        {sale.status ?? "Pending"}
                    </Badge>
                </div>

                {/* Customer */}
                <div className="w-1/4 truncate text-sm">
                    {sale.customer?.name}
                </div>

                {/* Amount */}
                <div className="flex w-1/4 justify-end text-sm">
                    ${sale.grandTotal?.toFixed(2)}
                </div>
            </div>
        </li>
    );
}
