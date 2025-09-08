"use client";

import { useTRPC } from "@/trpc/client";
import { useTableData } from "..";

import { LoadMoreTRPC } from "../load-more";

import { useSalesOrdersStore } from "@/store/sales-orders";
import { Card, CardContent } from "@gnd/ui/card";
import { EyeIcon } from "lucide-react";
import { Badge } from "@gnd/ui/badge";
import { ProductImage } from "@/app/(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products/product";
import { useProductReportFilters } from "@/hooks/use-product-report-filter-params";

export function DataTable() {
    const trpc = useTRPC();
    const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useProductReportFilters();
    const { data, resultCount, total, ref, hasNextPage } = useTableData({
        filter: filters,
        route: trpc.sales.getProductReport,
    });
    // const tableScroll = useTableScroll({
    //     useColumnWidths: true,
    //     startFromColumn: 2,
    // });
    // const overviewQuery = useSalesOverviewQuery();
    return (
        <div>
            <div className="">{`1-${resultCount || total} of ${total}`}</div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data?.map((product, pi) => (
                    <Card
                        key={pi}
                        className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50"
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                                <div className="size-20">
                                    <ProductImage
                                        aspectRatio={0.8}
                                        item={{
                                            product: {
                                                img: product.img,
                                                title: product?.name,
                                            },
                                        }}
                                    />
                                </div>
                                {/* <img
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="h-16 w-16 rounded-lg object-cover"
                            /> */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <h3 className="font-semibold text-sm uppercase leading-tight">
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
                                                $
                                                {product.revenue.toLocaleString()}
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
                                        <span>
                                            Click for detailed statistics
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {hasNextPage && (
                <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
            )}
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

