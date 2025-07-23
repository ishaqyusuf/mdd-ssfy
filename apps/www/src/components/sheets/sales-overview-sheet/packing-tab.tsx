import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useQuery } from "@tanstack/react-query";

export function PackingTab({}) {
    const query = useSalesOverviewQuery();
    const { trpc, ...sq } = query.salesQuery;
    const { data } = useQuery(
        trpc.dispatch.dispatchOverview.queryOptions(
            {
                dispatchId: query?.params?.dispatchId,
            },
            {
                enabled: !!query.params.dispatchId,
            },
        ),
    );
    return <></>;
}

