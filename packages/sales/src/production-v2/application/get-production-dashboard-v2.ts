import type { Db } from "@gnd/db";

import type { ProductionV2ListQuery } from "../contracts";
import {
	getSalesProductionDashboard,
	getSalesProductions,
} from "../../sales-production";

export async function getProductionDashboardV2(
	db: Db,
	query: ProductionV2ListQuery,
) {
	const { scope, workerId, ...filters } = query;
	const resolvedWorkerId = scope === "worker" ? workerId : null;

	const [summary, completed] = await Promise.all([
		getSalesProductionDashboard(db, {
			...filters,
			workerId: resolvedWorkerId,
		}),
		getSalesProductions(db, {
			...filters,
			workerId: resolvedWorkerId,
			production: "completed",
			size: 50,
		}),
	]);
	const safeSummary = summary ?? {
		summary: {
			queueCount: 0,
			dueTodayCount: 0,
			dueTomorrowCount: 0,
			pastDueCount: 0,
		},
		alerts: {
			pastDue: [],
			dueToday: [],
			dueTomorrow: [],
		},
		calendar: [],
	};
	const completedCount = completed?.meta?.count || completed?.data?.length || 0;

	return {
		...safeSummary,
		summary: {
			...safeSummary.summary,
			completedCount,
		},
		labels: [
			{
				key: "past-due",
				label: "Past Due",
				count: safeSummary.summary.pastDueCount,
			},
			{
				key: "due-today",
				label: "Due Today",
				count: safeSummary.summary.dueTodayCount,
			},
			{
				key: "due-tomorrow",
				label: "Due Tomorrow",
				count: safeSummary.summary.dueTomorrowCount,
			},
			{
				key: "completed",
				label: "Completed",
				count: completedCount,
			},
		],
	};
}
