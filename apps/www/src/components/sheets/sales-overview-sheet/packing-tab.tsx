import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { PackingTabSkeleton } from "./packing-tab.skeleton";

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
    useEffect(() => {
        console.log(data);
    }, [data]);
    if (isLoading) return <PackingTabSkeleton />;
    return <div></div>;
}

