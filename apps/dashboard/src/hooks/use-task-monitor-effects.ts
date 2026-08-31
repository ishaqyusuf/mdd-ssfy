"use client";

import type { TaskMonitorTask } from "@/store/task-monitor";
import { useCallback } from "react";
import { useSalesQueryClient } from "./use-sales-query-client";

type TaskEffectPhase = "success" | "error" | "canceled";
const FULFILLMENT_RECONCILIATION_DELAY_MS = 500;

function waitForFulfillmentProjection() {
	return new Promise((resolve) =>
		setTimeout(resolve, FULFILLMENT_RECONCILIATION_DELAY_MS),
	);
}

function getBacklogCount(output: unknown) {
	if (!output || typeof output !== "object") return null;
	const count = (output as { backlogCount?: unknown }).backlogCount;
	return typeof count === "number" && Number.isFinite(count) ? count : null;
}

export function useTaskMonitorEffects() {
	const sq = useSalesQueryClient();

	const runTaskEffect = useCallback(
		async (task: TaskMonitorTask, phase: TaskEffectPhase, output?: unknown) => {
			if (!task.intent) return;
			if (task.intent.name === "sales.adapt-legacy-inventory") {
				if (phase === "canceled") return;
				await sq.events.legacyInventoryAdapted({
					orderNo: task.intent.args.orderNo,
					salesId: task.intent.args.salesId,
					salesType: "order",
				});
				return;
			}
			if (phase !== "success") return;

			switch (task.intent.name) {
				case "sales.mark-as-production-completed": {
					const sales = task.intent.args.sales;
					await sq.events.productionUpdated(sales);
					return;
				}
				case "sales.cancel-production-completion": {
					const sales = task.intent.args.sales;
					await sq.events.productionUpdated(sales);
					return;
				}
				case "sales.mark-as-fulfilled": {
					const sales = task.intent.args.sales;
					await sq.events.fulfillmentUpdated(sales);
					await waitForFulfillmentProjection();
					await sq.events.fulfillmentUpdated(sales);
					const backlogCount = getBacklogCount(output);
					if (backlogCount !== null) {
						sq.qc.setQueriesData(
							{ queryKey: sq.trpc.dispatch.workspaceSummary.pathKey() },
							(current) =>
								current && typeof current === "object"
									? { ...current, backlog: backlogCount }
									: current,
						);
					}
					return;
				}
			}
		},
		[sq],
	);

	return { runTaskEffect };
}
