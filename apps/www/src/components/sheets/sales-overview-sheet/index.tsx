"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { SalesOverviewProvider, useSaleOverview } from "./context";
import { DispatchTab } from "./dispatch-tab";
import { GeneralTab } from "./general-tab";
import { ProductionTab } from "./production-tab";
import { TransactionsTab } from "../customer-overview-sheet/transactions-tab";
import { cn } from "@gnd/ui/cn";
import { PackingTab } from "./packing-tab";

export default function SalesOverviewSheet() {
    const query = useSalesOverviewQuery();
    return query["sales-overview-id"] ? <Modal /> : null;
}
function Modal() {
    return (
        <SalesOverviewProvider args={[]}>
            <Content />
        </SalesOverviewProvider>
    );
}
function Content() {
    usePageTitle();
    const query = useSalesOverviewQuery();
    const customerQuery = useCustomerOverviewQuery();
    const { data } = useSaleOverview();
    const isQuote = data?.type === "quote";
    return (
        <CustomSheet
            sheetName="sales-overview-sheet"
            open
            onOpenChange={query.close}
            floating
            rounded
            size="2xl"
        >
            <Tabs
                value={query?.params?.salesTab}
                onValueChange={(e) => {
                    query.setParams({
                        salesTab: e as any,
                        "prod-item-tab": null,
                        "prod-item-view": null,

                        dispatchOverviewId: null,
                    });
                }}
            >
                <SheetHeader>
                    <DataSkeletonProvider value={{ loading: !data?.id } as any}>
                        <SheetTitle>
                            <DataSkeleton pok="textLg">
                                <span>
                                    {[data?.orderId, data?.displayName]?.join(
                                        " | ",
                                    )}
                                </span>
                            </DataSkeleton>
                        </SheetTitle>
                    </DataSkeletonProvider>
                    <SheetDescription asChild>
                        <TabsList className="flex w-full justify-start">
                            {query?.assignedTo ? (
                                <>
                                    <TabsTrigger value="production">
                                        Productions
                                    </TabsTrigger>
                                    <TabsTrigger value="production-notes">
                                        Notes
                                    </TabsTrigger>
                                </>
                            ) : query?.dispatchId ? (
                                <>
                                    <TabsTrigger value="production">
                                        Productions
                                    </TabsTrigger>
                                    <TabsTrigger value="dispatch-notes">
                                        General
                                    </TabsTrigger>
                                    <TabsTrigger value="packing">
                                        Packing List
                                    </TabsTrigger>
                                </>
                            ) : (
                                <>
                                    <TabsTrigger value="general">
                                        General
                                    </TabsTrigger>
                                    <TabsTrigger
                                        className={cn(!isQuote || "hidden")}
                                        value="production"
                                    >
                                        Productions
                                    </TabsTrigger>
                                    <TabsTrigger
                                        className={cn(!isQuote || "hidden")}
                                        value="transactions"
                                    >
                                        Transactions
                                    </TabsTrigger>
                                    {/* <TabsTrigger value="payment">
                                        Payment
                                    </TabsTrigger> */}
                                    <TabsTrigger
                                        className={cn(!isQuote || "hidden")}
                                        value="dispatch"
                                    >
                                        Dispatch
                                    </TabsTrigger>
                                </>
                            )}
                        </TabsList>
                    </SheetDescription>
                </SheetHeader>
            </Tabs>
            <CustomSheetContent className="-mt-4">
                <Tabs value={query?.params?.salesTab}>
                    {query?.assignedTo ? (
                        <>
                            <TabsContent value="production">
                                <ProductionTab />
                            </TabsContent>
                            <TabsContent value="production-notes">
                                <Note
                                    subject={"Production Note"}
                                    headline=""
                                    statusFilters={["public"]}
                                    typeFilters={["production", "general"]}
                                    tagFilters={[
                                        noteTagFilter("salesId", data?.id),
                                    ]}
                                />
                            </TabsContent>
                        </>
                    ) : query?.dispatchId ? (
                        <>
                            <TabsContent value="production">
                                <ProductionTab />
                            </TabsContent>
                            <TabsContent value="packing">
                                <PackingTab />
                            </TabsContent>
                        </>
                    ) : (
                        <>
                            <TabsContent value="general">
                                <GeneralTab />
                            </TabsContent>
                            <TabsContent value="production">
                                <ProductionTab />
                            </TabsContent>
                            <TabsContent value="transactions">
                                <TransactionsTab salesId={data?.orderId} />
                            </TabsContent>
                            <TabsContent value="dispatch">
                                <DispatchTab />
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </CustomSheetContent>
        </CustomSheet>
    );
}
