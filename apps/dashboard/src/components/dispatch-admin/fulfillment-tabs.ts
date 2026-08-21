import type { PageTabItem } from "@/components/page-tabs";

export const fulfillmentPageTabs = [
	{
		title: "All",
		params: {
			tab: "all",
			status: null,
			view: null,
			calendarView: null,
			calendarDate: null,
		},
	},
	{
		title: "Completed",
		params: {
			tab: "completed",
			status: null,
			view: null,
			calendarView: null,
			calendarDate: null,
		},
	},
	{ title: "Calendar", query: "tab=calendar" },
] satisfies PageTabItem[];
