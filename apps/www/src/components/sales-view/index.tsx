"use client";

import { Sheet, Tabs } from "@gnd/ui/namespace";
import { GeneralTab } from "./general-tab";
import { ProductionTab } from "./production-tab";
import { TransactionTab } from "./transaction-tab";
import { DispatchTab } from "./dispatch-tab";

export function SalesOverviewSheet() {
    return (
        <Sheet>
            <Sheet.Content className="w-full md:w-3/4 lg:w-1/2">
                <Sheet.Header>
                    <Sheet.Title>Sales Overview</Sheet.Title>
                    <Sheet.Description>
                        A detailed overview of the sales order.
                    </Sheet.Description>
                </Sheet.Header>
                <div className="py-4">
                    <Tabs defaultValue="general">
                        <Tabs.List>
                            <Tabs.Trigger value="general">General</Tabs.Trigger>
                            <Tabs.Trigger value="production">
                                Production
                            </Tabs.Trigger>
                            <Tabs.Trigger value="transactions">
                                Transactions
                            </Tabs.Trigger>
                            <Tabs.Trigger value="dispatch">
                                Dispatch
                            </Tabs.Trigger>
                        </Tabs.List>
                        <Tabs.Content value="general">
                            <GeneralTab />
                        </Tabs.Content>
                        <Tabs.Content value="production">
                            <ProductionTab />
                        </Tabs.Content>
                        <Tabs.Content value="transactions">
                            <TransactionTab />
                        </Tabs.Content>
                        <Tabs.Content value="dispatch">
                            <DispatchTab />
                        </Tabs.Content>
                    </Tabs>
                </div>
            </Sheet.Content>
        </Sheet>
    );
}

