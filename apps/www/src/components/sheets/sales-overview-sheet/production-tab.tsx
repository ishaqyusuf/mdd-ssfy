import React, { createContext, useContext, useState } from "react";
import DevOnly from "@/_v2/components/common/dev-only";
import { DataSkeleton } from "@/components/data-skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { cn } from "@/lib/utils";
import { skeletonListData } from "@/utils/format";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { Card, CardHeader } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";

import { AccessBased } from "./access-based";
import { ProductionProvider, useProduction } from "./context";
import { ItemProgressBar } from "./item-progress-bar";
import { ProductionItemDetail } from "./production-item-detail";
import { ProductionItemMenu } from "./production-item-menu";
import { ProductionTabFooter } from "./production-tab-footer";

export function ProductionTab({}) {
    return (
        <ProductionProvider args={[]}>
            <Content />
            <AccessBased>
                <ProductionTabFooter />
            </AccessBased>
        </ProductionProvider>
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
                "prod-item-tab": "notes",
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
                            <AccessBased>
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
                            </AccessBased>
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
                                <DevOnly>{item.controlUid}</DevOnly>
                            </div>

                            <div className="flex items-center space-x-2">
                                <AccessBased>
                                    <ProductionItemMenu />
                                </AccessBased>
                            </div>
                        </div>
                        <div className="mt-4 flex  space-x-4">
                            <ItemProgressBar item={item} />
                            <div>
                                <AccordionTrigger
                                    onClick={toggle}
                                    className="w-auto p-0 hover:no-underline"
                                >
                                    <span className="sr-only">Toggle</span>
                                </AccordionTrigger>
                            </div>
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
