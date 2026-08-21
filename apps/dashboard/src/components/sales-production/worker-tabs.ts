import type { PageTabItem } from "@/components/page-tabs";

type WorkerProductionTabCounts = {
	dueTodayCount: number;
	unscheduledCount: number;
	pastDueCount: number;
	futureCount: number;
	completedCount: number;
};

export function createWorkerProductionPageTabs({
	dueTodayCount,
	unscheduledCount,
	pastDueCount,
	futureCount,
	completedCount,
}: WorkerProductionTabCounts): PageTabItem[] {
	return [
		{
			title: "Due Today",
			count: dueTodayCount,
			params: workerTableParams("due-today"),
		},
		{
			title: "Calendar",
			params: {
				tab: "calendar",
				view: "calendar",
				queue: null,
				due: null,
				date: null,
				production: "pending",
				productionDueDate: null,
				show: null,
			},
		},
		{
			title: "Unscheduled",
			count: unscheduledCount,
			params: workerTableParams("unscheduled"),
		},
		{
			title: "Past Due",
			count: pastDueCount,
			params: workerTableParams("past-due"),
		},
		{
			title: "Future",
			count: futureCount,
			params: workerTableParams("future"),
		},
		{
			title: "Completed",
			count: completedCount,
			params: {
				tab: "completed",
				view: "table",
				queue: null,
				due: null,
				date: null,
				production: "completed",
				productionDueDate: null,
				show: null,
			},
		},
	];
}

function workerTableParams(
	show: "due-today" | "past-due" | "future" | "unscheduled",
) {
	return {
		tab: "queue",
		view: "table",
		queue: null,
		due: null,
		date: null,
		production: "pending",
		productionDueDate: null,
		show,
	};
}
