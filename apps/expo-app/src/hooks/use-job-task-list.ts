import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useJobTaskList(jobCostData) {
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({})
  );
  const tasks = useMemo(() => {
    if (!costData?.data || !jobCostData) return [];
    return (
      costData.data?.list
        ?.filter((c: any) => (jobCostData?.[c.uid]?.qty || 0) > 0)
        .map((c: any) => {
          const qty = jobCostData?.[c.uid]?.qty || 0;
          const cost = jobCostData?.[c.uid]?.cost || 0;
          return {
            uid: c.uid,
            title: c.title,
            qty,
            totalCost: qty * cost,
            cost,
          };
        }) || []
    );
  }, [costData, jobCostData]);
  return { tasks };
}
