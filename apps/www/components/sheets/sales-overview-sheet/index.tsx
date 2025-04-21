"use client";

import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { GeneralTab } from "./general-tab-1";
import { ProductionTab } from "./production-tab";

export default function SalesOverviewSheet() {
    const query = useSalesOverviewQuery();
    return query["sales-overview-id"] ? <Modal /> : null;
}
function Modal() {
    usePageTitle();
    const query = useSalesOverviewQuery();
    const customerQuery = useCustomerOverviewQuery();

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
                        refreshTok: null,
                    });
                }}
            >
                <SheetHeader>
                    <SheetTitle>
                        {/* {store?.overview?.title || "Loading..."} */}
                    </SheetTitle>
                    <SheetDescription>
                        <TabsList className="flex w-full justify-start">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="production">
                                Productions
                            </TabsTrigger>
                            <TabsTrigger value="quotes">Quotes</TabsTrigger>
                            <TabsTrigger value="transactions">
                                Transactions
                            </TabsTrigger>
                            <TabsTrigger value="pay-portal">
                                Pay Portal
                            </TabsTrigger>
                        </TabsList>
                    </SheetDescription>
                </SheetHeader>
            </Tabs>
            <CustomSheetContent className="-mt-4">
                <Tabs value={query?.params?.salesTab}>
                    <TabsContent value="general">
                        <GeneralTab />
                    </TabsContent>
                    <TabsContent value="production">
                        <ProductionTab />
                    </TabsContent>
                </Tabs>
            </CustomSheetContent>
        </CustomSheet>
    );
}
