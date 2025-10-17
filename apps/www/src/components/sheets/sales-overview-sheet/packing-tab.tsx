import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { PackingTabSkeleton } from "./packing-tab.skeleton";
import { PackingOrderInformation } from "@/components/packing-order-information";
import { PackingDriverInformation } from "@/components/packing-driver-information";
import { PackingItemsList } from "@/components/packing-items-list";
import { PackingProvider, usePacking } from "@/hooks/use-sales-packing";
import { useEffect } from "react";

import { DispatchActions } from "@/components/dispatch-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { DispatchCompleteForm } from "@/components/dispatch-complete-form";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function PackingTab({}) {
    const query = useSalesOverviewQuery();
    const { trpc, ...sq } = query.salesQuery;
    const { data, isLoading } = useQuery(
        trpc.dispatch.dispatchOverview.queryOptions(
            {
                dispatchId: query?.params?.dispatchId,
                salesNo: query.params["sales-overview-id"],
            },
            {
                enabled: !!query.params.dispatchId,
            },
        ),
    );

    const qc = useQueryClient();

    if (isLoading) return <PackingTabSkeleton />;
    if (!data) return <>Error</>;
    return (
        <PackingProvider
            args={[
                {
                    data,
                },
            ]}
        >
            <Content />
        </PackingProvider>
    );
}
function Content({}) {
    const { data, ...ctx } = usePacking();
    return (
        <Tabs value={ctx.mainTab}>
            <TabsContent value="main">
                <div className="flex flex-col gap-4">
                    <DispatchActions />
                    <Tabs defaultValue="general">
                        <TabsList>
                            <TabsTrigger value="general">
                                Dispatch Info
                            </TabsTrigger>
                            <TabsTrigger value="packing">
                                Packing List
                            </TabsTrigger>
                            {/* <TabsTrigger value="finalize">
                            Finalize Dispatch
                        </TabsTrigger> */}
                        </TabsList>
                        <TabsContent value="general">
                            <PackingOrderInformation />

                            <PackingDriverInformation />
                        </TabsContent>
                        <TabsContent value="packing">
                            <PackingItemsList />
                        </TabsContent>
                    </Tabs>
                </div>
            </TabsContent>
            <TabsContent value="finalize">
                <DispatchCompleteForm />
            </TabsContent>
            {/* <div className="fixed top-0 left-0 m-4">
                <Button>
                    <Icons.ArrowLeft className="size-4" />
                </Button>
            </div> */}
        </Tabs>
    );
}

