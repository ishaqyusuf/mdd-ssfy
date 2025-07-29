import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PackingTabSkeleton } from "./packing-tab.skeleton";
import { PackingOrderInformation } from "@/components/packing-order-information";
import { PackingDriverInformation } from "@/components/packing-driver-information";
import { PackingItemsList } from "@/components/packing-items-list";
import { PackingProvider } from "@/hooks/use-sales-packing";
import { useEffect } from "react";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { Button } from "@gnd/ui/button";

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
                // throwOnError(error, query) {
                //     console.log(error);
                // },
            },
        ),
    );
    useEffect(() => {
        console.log(data);
    }, [data]);
    const qc = useQueryClient();
    const trigger = useTaskTrigger({
        onSucces() {
            qc.invalidateQueries({
                queryKey: trpc.dispatch.dispatchOverview.queryKey(),
            });
        },
    });
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
            <div className="">
                <Button
                    disabled={trigger?.isLoading}
                    onClick={(e) => {
                        trigger.trigger({
                            taskName: "reset-sales-control",
                            payload: {
                                salesId: data?.order?.id,
                            },
                        });
                    }}
                >
                    Reset
                </Button>
            </div>
            <PackingOrderInformation />
            <PackingDriverInformation />
            <PackingItemsList />
        </PackingProvider>
    );
}

