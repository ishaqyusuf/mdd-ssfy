"use client";

import { useEffect, useState } from "react";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { usePageTitle } from "@/hooks/use-page-title";

import { Button } from "@gnd/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { CustomerQuotesTab } from "./customer-quotes-tab";
import { CustomerSalesTab } from "./customer-sales-tab";
import { GeneralTab } from "./general-tab";
import { PayPortalTab } from "./pay-portal-tab";
import { TransactionsTab } from "./transactions-tab";

export function CustomerOverviewSheet() {
    const ctx = useCustomerOverviewQuery();
    return ctx?.opened ? <Modal /> : null;
}
function Modal() {
    const ctx = useCustomerOverviewQuery();
    usePageTitle();

    const currenTab = ctx.params?.tab;
    const [customerName, setCustomerName] = useState(null);

    useEffect(() => {
        if (!ctx.opened) return;
        function _title(_t) {
            return [_t, customerName].filter(Boolean).join(" - ");
        }
        document.title = {
            general: _title(`Overview`),
            sales: _title(`Sales`),
            quotes: _title(`Quotes`),
            transactions: _title(`Transactions`),
            "pay-portal": _title(`Pay Portal`),
        }[currenTab];
    }, [currenTab, ctx.opened, customerName]);
    return (
        <CustomSheet
            sheetName="customer-overview-sheet"
            open={ctx.opened}
            rounded
            size="xl"
            floating
            onOpenChange={(e) => {
                ctx.close();
                // pt.reset();
            }}
        >
            <Tabs
                value={currenTab}
                onValueChange={(e) => {
                    ctx.setParams({
                        tab: e as any,
                    });
                }}
                className=""
            >
                <SheetHeader>
                    <SheetTitle>Customer Overview</SheetTitle>
                    <SheetDescription>
                        <TabsList className="flex w-full justify-start">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="sales">Sales</TabsTrigger>
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
                <Tabs value={currenTab}>
                    <TabsContent value="general">
                        <GeneralTab setCustomerName={setCustomerName} />
                    </TabsContent>
                    <TabsContent value="pay-portal">
                        <PayPortalTab />
                    </TabsContent>
                    <TabsContent value="transactions">
                        <TransactionsTab accountNo={ctx.params.accountNo} />
                    </TabsContent>
                    <TabsContent value="quotes">
                        <CustomerQuotesTab accountNo={ctx.params.accountNo} />
                    </TabsContent>
                    <TabsContent value="sales">
                        <CustomerSalesTab accountNo={ctx.params.accountNo} />
                    </TabsContent>
                </Tabs>
            </CustomSheetContent>
        </CustomSheet>
    );
}
