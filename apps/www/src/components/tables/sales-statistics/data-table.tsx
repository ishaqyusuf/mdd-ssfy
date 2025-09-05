"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider, useTableData } from "..";
import { columns, mobileColumn } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";

import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { BatchActions } from "./batch-actions";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { Card, CardContent } from "@gnd/ui/card";
import { EyeIcon } from "lucide-react";
import { Badge } from "@gnd/ui/badge";

export function DataTable() {
    const trpc = useTRPC();
    const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useOrderFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter: filters,
        route: trpc.sales.salesStatistics,
    });

    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const overviewQuery = useSalesOverviewQuery();
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.map((product) => (
                <Card className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <img
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="h-16 w-16 rounded-lg object-cover"
                            />
                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                    <h3 className="font-semibold text-sm leading-tight">
                                        {product.name}
                                    </h3>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {product.category}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <p className="text-muted-foreground">
                                            Units Sold
                                        </p>
                                        <p className="font-semibold">
                                            {product.units}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Revenue
                                        </p>
                                        <p className="font-semibold">
                                            ${product.revenue.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Cost Price
                                        </p>
                                        <p className="font-semibold">
                                            ${product.costPrice}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Sales Price
                                        </p>
                                        <p className="font-semibold">
                                            ${product.salesPrice}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            Margin
                                        </span>
                                        <span className="font-semibold text-primary">
                                            {(
                                                ((product.salesPrice -
                                                    product.costPrice) /
                                                    product.salesPrice) *
                                                100
                                            ).toFixed(1)}
                                            %
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                                    <EyeIcon className="h-3 w-3" />
                                    <span>Click for detailed statistics</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
    // return (
    //     <TableProvider
    //         args={[
    //             {
    //                 columns,
    //                 mobileColumn: mobileColumn,
    //                 data,
    //                 checkbox: true,
    //                 tableScroll,
    //                 rowSelection,
    //                 setRowSelection,
    //                 tableMeta: {
    //                     rowClick(id, rowData) {
    //                         overviewQuery.open2(rowData.uuid, "sales");
    //                     },
    //                 },
    //             },
    //         ]}
    //     >
    //         <div className="flex flex-col gap-4 w-full">
    //             <div
    //                 ref={tableScroll.containerRef}
    //                 className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
    //             >
    //                 <Table>
    //                     <TableHeaderComponent />
    //                     <TableBody>
    //                         <TableRow />
    //                     </TableBody>
    //                 </Table>
    //             </div>
    //             {hasNextPage && (
    //                 <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
    //             )}
    //             <BatchActions />
    //         </div>
    //     </TableProvider>
    // );
}

