import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function useEmployeeOverview(employeeId: number) {
    const trpc = useTRPC();
    const { data, isLoading, error } = useQuery(
        trpc.hrm.getEmployeeOverview.queryOptions({ id: employeeId }),
    );

    return { data: data ?? null, isLoading, error };
}
