"use client";

import { useEffect } from "react";
import { salesOverviewStore } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet/store";
import Button from "@/components/common/button";
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
    useEffect(() => {
        document.title = "Sales Overview";
    }, []);
    const store = salesOverviewStore();

    return (
        <CustomSheet
            open
            onOpenChange={query.close}
            floating
            rounded
            size="2xl"
        >
            <Tabs
                value={query?.params?.tab}
                onValueChange={(e) => {
                    query.setParams({
                        tab: e as any,
                    });
                }}
            >
                <SheetHeader>
                    <SheetTitle>
                        {store?.overview?.title || "Loading..."}
                    </SheetTitle>
                    <SheetDescription>
                        <TabsList className="flex w-full justify-start">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="productions">
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
                <Tabs value={query?.params?.tab}>
                    <TabsContent value="general">
                        <GeneralTab />
                    </TabsContent>
                    <TabsContent value="productions">
                        <ProductionTab />
                    </TabsContent>
                </Tabs>
            </CustomSheetContent>
        </CustomSheet>
    );
}
