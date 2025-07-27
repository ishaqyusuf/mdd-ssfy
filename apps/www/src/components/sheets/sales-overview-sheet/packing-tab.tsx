import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useQuery } from "@tanstack/react-query";
import { PackingTabSkeleton } from "./packing-tab.skeleton";
import { PackingOrderInformation } from "@/components/packing-order-information";
import { PackingDriverInformation } from "@/components/packing-driver-information";
import { PackingItemsList } from "@/components/packing-items-list";
import { PackingProvider } from "@/hooks/use-sales-packing";

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

    if (isLoading) return <PackingTabSkeleton />;
    return (
        <PackingProvider
            args={[
                {
                    data,
                },
            ]}
        >
            <PackingOrderInformation />
            <PackingDriverInformation />
            <PackingItemsList />
        </PackingProvider>
    );
}

