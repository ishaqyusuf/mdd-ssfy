"use client";

import type { TaskMonitorTask } from "@/store/task-monitor";
import { useTRPC } from "@/trpc/client";
import { useCallback } from "react";
import { useSalesQueryClient } from "./use-sales-query-client";

type TaskEffectPhase = "success" | "error" | "canceled";

export function useTaskMonitorEffects() {
    const sq = useSalesQueryClient();
    const trpc = useTRPC();

    const runTaskEffect = useCallback(
        async (task: TaskMonitorTask, phase: TaskEffectPhase) => {
            if (phase !== "success" || !task.intent) return;

            switch (task.intent.name) {
                case "sales.mark-as-fulfilled":
                case "sales.mark-as-production-completed":
                    await Promise.all([
                        sq.invalidate.salesList(),
                        sq.invalidate.productionOverview(),
                        sq.invalidate.saleOverview(),
                        sq.qc.invalidateQueries({
                            queryKey: trpc.sales.getOrdersV2.infiniteQueryKey(),
                        }),
                        sq.qc.invalidateQueries({
                            queryKey: trpc.sales.getOrdersV2Summary.queryKey(),
                        }),
                    ]);
                    return;
            }
        },
        [sq, trpc],
    );

    return { runTaskEffect };
}
