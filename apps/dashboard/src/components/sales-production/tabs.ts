import type { PageTabItem } from "@/components/page-tabs";

export const salesProductionPageTabs = [
	{
		title: "Due Today",
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
] satisfies PageTabItem[];
