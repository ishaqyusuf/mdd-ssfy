import type { PageTabItem } from "@/components/page-tabs";

type SalesProductionTabCounts = {
	dueTodayCount: number;
	pastDueCount: number;
	awaitingReviewCount: number;
	completedCount: number;
};

export function createSalesProductionPageTabs({
	dueTodayCount,
	pastDueCount,
	awaitingReviewCount,
	completedCount,
}: SalesProductionTabCounts): PageTabItem[] {
	return [
		{
			title: "Due Today",
			count: dueTodayCount,
			params: {
				tab: "queue",
				view: "table",
				queue: null,
				due: "today",
				date: null,
				production: null,
				productionDueDate: null,
				show: null,
				label: null,
			},
		},
		{
			title: "Past Due",
			count: pastDueCount,
			params: {
				tab: "queue",
				view: "table",
				queue: null,
				due: "overdue",
				date: null,
				production: null,
				productionDueDate: null,
				show: null,
				label: null,
			},
		},
		{
			title: "Review",
			count: awaitingReviewCount,
			params: {
				tab: "reviews",
				view: "table",
				queue: null,
				due: null,
				date: null,
				material: null,
				sort: null,
				assignedToId: null,
				priority: null,
				production: null,
				productionDueDate: null,
				show: null,
				label: null,
			},
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
				production: null,
				productionDueDate: null,
				show: null,
				label: null,
			},
		},
	];
}
