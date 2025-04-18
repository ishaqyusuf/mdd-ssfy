import React, { createContext, useContext } from "react";
import { getSalesProductionOverviewAction } from "@/actions/get-sales-production-overview";
import { DataSkeleton } from "@/components/data-skeleton";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import { cn } from "@/lib/utils";
import { skeletonListData } from "@/utils/format";
import { CheckCircle, MoreVertical, Truck, UserPlus } from "lucide-react";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@gnd/ui/button";
import { Card, CardHeader } from "@gnd/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { ItemProgressBar } from "./item-progress-bar";
import { ProductionItemDetail } from "./production-item-detail";

function useContextProductionContext() {
    const ctx = useSalesOverviewQuery();

    const loader = async () =>
        // new Promise((resolve) =>
        //     setTimeout(async () => {
        //         resolve(
        {
            await timeout(100);
            const res = await getSalesProductionOverviewAction(
                ctx.params["sales-overview-id"],
            );
            console.log(res);

            return res;
        };
    const customerQuery = useCustomerOverviewQuery();
    const data = useAsyncMemo(loader, [ctx.refreshTok]);

    return {
        data,
        ctx,
    };
}
export function ProductionTab({}) {
    const { data, ctx } = useContextProductionContext();

    return (
        <DataSkeletonProvider value={{ loading: !data?.orderId } as any}>
            <div className="mt-0 space-y-6">
                <Accordion
                    type="multiple"
                    value={[ctx.params["prod-item-view"]]}
                    className="space-y-4"
                >
                    {skeletonListData(data?.items, 5).map((item, i) => (
                        <DataSkeleton className="h-48" key={i}>
                            {/* <div className={cn(!item?.itemConfig?.production && "hidden")}> */}

                            <ItemCard item={item} key={i} />
                            {/* </div> */}
                        </DataSkeleton>
                    ))}
                </Accordion>
            </div>
        </DataSkeletonProvider>
    );
}
export interface ItemCardProps {
    item: ReturnType<
        typeof useContextProductionContext
    >["data"]["items"][number];
}
function useItemCardContext(item: ItemCardProps["item"]) {
    const ctx = useSalesOverviewQuery();
    return {
        item,
        queryCtx: ctx,
    };
}
const ItemCardContext =
    createContext<ReturnType<typeof useItemCardContext>>(null);
export const useProductionItem = () => useContext(ItemCardContext);
function ItemCard({ item }: ItemCardProps) {
    const ctx = useItemCardContext(item);
    const queryCtx = ctx.queryCtx;
    const toggle = () => {
        if (queryCtx.params["prod-item-view"] == item.controlUid)
            queryCtx.setParams({
                "prod-item-view": null,
                "prod-item-tab": null,
            });
        else
            queryCtx.setParams({
                "prod-item-view": item.controlUid,
                "prod-item-tab": "assignments",
            });
    };
    return (
        <ItemCardContext.Provider value={ctx}>
            <AccordionItem
                value={item.controlUid}
                className={cn(
                    "overflow-hidden border-border",
                    item.controlUid == queryCtx["prod-item-view"] ? "" : "",
                    !item?.itemConfig?.production && "hidden",
                )}
            >
                <Card
                    className={cn(
                        item.controlUid == queryCtx["prod-item-view"]
                            ? "border-muted-foregrounds sbg-gradient-to-tr  border-destructive/50 from-slate-50 to-slate-50/10 shadow-xl"
                            : "hover:border-muted-foreground/50",
                    )}
                >
                    <CardHeader className="space-y-4 px-4 pb-2 pt-4">
                        <div className="flex items-start justify-between">
                            <div
                                className="cursor-pointer space-y-1"
                                onClick={toggle}
                            >
                                <h3 className="text-base font-semibold uppercase">
                                    {item.title}
                                </h3>
                                <p className="font-mono text-sm font-semibold uppercase text-muted-foreground">
                                    {item.subtitle}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {/* <Badge
                                variant={
                                    completed === total ? "success" : "outline"
                                }
                            >
                                {completed === total
                                    ? "Completed"
                                    : `${completed}/${total} Complete`}
                            </Badge> */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Mark as Completed
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Assign All
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Truck className="mr-2 h-4 w-4" />
                                            Mark as Delivered
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center space-x-4">
                            <div className="flex-1">
                                <ItemProgressBar item={item} />
                            </div>
                            <AccordionTrigger
                                onClick={toggle}
                                className="p-0 hover:no-underline"
                            >
                                <span className="sr-only">Toggle</span>
                            </AccordionTrigger>
                        </div>
                    </CardHeader>
                    <AccordionContent>
                        <ProductionItemDetail />
                    </AccordionContent>
                </Card>
            </AccordionItem>
        </ItemCardContext.Provider>
    );
}
