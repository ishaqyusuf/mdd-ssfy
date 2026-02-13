import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useJobFilterParams } from "./use-contractor-jobs-filter-params";

export function useJobsKpi() {
    const { filters } = useJobFilterParams();
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.jobs.getKpis.queryOptions({
            // from: params.from,
            // to: params.to,
        }),
    );
    return {
        ...(data || {}),
        isLoading,
    };
}

