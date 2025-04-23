import React, { createContext, useContext, useState } from "react";
import { getCachedProductionUsers } from "@/actions/cache/get-cached-production-users";
import { getSalesProductionOverviewAction } from "@/actions/get-sales-production-overview";
import { DataSkeleton } from "@/components/data-skeleton";
import { EmptyState } from "@/components/empty-state";
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
import { createContextFactory } from "@/utils/context-factory";
import { skeletonListData } from "@/utils/format";
import { useAsyncMemo } from "use-async-memo";

import { Card, CardHeader } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";

import { ItemProgressBar } from "./item-progress-bar";
import { ProductionItemDetail } from "./production-item-detail";
import { ProductionItemMenu } from "./production-item-menu";
import { ProductionTabFooter } from "./production-tab-footer";

const { useContext: useProduction, Provider } = createContextFactory(
    function () {
        const ctx = useSalesOverviewQuery();
        const users = useAsyncMemo(async () => {
            await timeout(80);
            return await getCachedProductionUsers();
        }, []);
        const loader = async () => {
            await timeout(100);
            const res = await getSalesProductionOverviewAction(
                ctx.params["sales-overview-id"],
            );

            return res;
        };
        const customerQuery = useCustomerOverviewQuery();
        const data = useAsyncMemo(loader, [ctx.refreshTok]);
        const [selections, setSelections] = useState({});

        return {
            selections,
            setSelections,
            data,
            ctx,
            users,
        };
    },
);
export { useProduction };

export function ProductionTab({}) {
    return (
        <Provider args={[]}>
            <Content />
            <ProductionTabFooter />
        </Provider>
    );
}
function Content() {
    const { data, ctx } = useProduction();
    const items = data?.items?.filter((a) => a?.itemConfig?.production);
    const itemCount = items?.length || 0;
    return (
        <DataSkeletonProvider value={{ loading: !data?.orderId } as any}>
            <div className="mt-0 space-y-6">
                <Accordion
                    type="multiple"
                    value={[ctx.params["prod-item-view"]]}
                    className="space-y-4"
                >
                    <EmptyState
                        className="h-[70vh]"
                        description="No production items found"
                        icon="production"
                        empty={data?.orderId && !itemCount}
                    />

                    {skeletonListData(items, 5).map((item, i) => (
                        <DataSkeleton className="h-48" key={i}>
                            <ItemCard item={item} key={i} />
                        </DataSkeleton>
                    ))}
                </Accordion>
            </div>
        </DataSkeletonProvider>
    );
}
export interface ItemCardProps {
    item: ReturnType<typeof useProduction>["data"]["items"][number];
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
    const opened = item.controlUid == queryCtx["prod-item-view"];
    const prod = useProduction();

    return (
        <ItemCardContext.Provider value={ctx}>
            <AccordionItem
                value={item.controlUid}
                className={cn(
                    "overflow-hidden border-border",
                    opened ? "" : "",
                    !item?.itemConfig?.production && "hidden",
                )}
            >
                <Card
                    className={cn(
                        opened
                            ? "border-muted-foregrounds sbg-gradient-to-tr  border-muted/50 from-slate-50 to-slate-50/10 shadow-xl"
                            : "hover:border-muted-foreground/50",
                    )}
                >
                    <CardHeader
                        className={cn(
                            "space-y-4 px-4 pb-2 pt-4",
                            opened && "border-b border-muted/50 bg-rose-100/20",
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className="mt-1">
                                <Checkbox
                                    checked={
                                        prod.selections?.[item?.controlUid]
                                    }
                                    onCheckedChange={(e) => {
                                        prod.setSelections((current) => ({
                                            ...current,
                                            [item?.controlUid]:
                                                !current?.[item.controlUid],
                                        }));
                                    }}
                                    className="size-5"
                                />
                            </div>
                            <div
                                className="flex-1 cursor-pointer space-y-1"
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
                                <ProductionItemMenu />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center space-x-4">
                            <div
                                onClick={toggle}
                                className="flex-1 cursor-pointer"
                            >
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
                    <AccordionContent className="">
                        <ProductionItemDetail />
                    </AccordionContent>
                </Card>
            </AccordionItem>
        </ItemCardContext.Provider>
    );
}
