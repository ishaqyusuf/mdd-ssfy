import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function useJobsKpi() {
    const trpc = useTRPC();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data, isLoading } = useQuery(
        trpc.jobs.getKpis.queryOptions(
            {
                // from: params.from,
                // to: params.to,
            },
            {
                enabled: idleQueryEnabled,
                refetchOnWindowFocus: false,
                staleTime: 60 * 1000,
            },
        ),
    );
    return {
        ...(data || {}),
        isLoading: !idleQueryEnabled || isLoading,
    };
}
