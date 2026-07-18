"use client";

import type { TaskMonitorTask } from "@/store/task-monitor";
import { useCallback } from "react";
import { useSalesQueryClient } from "./use-sales-query-client";

type TaskEffectPhase = "success" | "error" | "canceled";

export function useTaskMonitorEffects() {
	const sq = useSalesQueryClient();

	const runTaskEffect = useCallback(
		async (task: TaskMonitorTask, phase: TaskEffectPhase) => {
			if (phase !== "success" || !task.intent) return;

			switch (task.intent.name) {
				case "sales.mark-as-production-completed": {
					const sales = task.intent.args.sales;
					await sq.events.productionUpdated(sales);
					return;
				}
				case "sales.mark-as-fulfilled": {
					const sales = task.intent.args.sales;
					await sq.events.fulfillmentUpdated(sales);
					return;
				}
			}
		},
		[sq],
	);

	return { runTaskEffect };
}
