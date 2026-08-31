import type { PageTabItem } from "@/components/page-tabs";

export const dispatchAdminPageTabs = [
	{ title: "Backlog", params: { section: "backlog" } },
	{ title: "Active", params: { section: "active", sort: "dueDate.asc" } },
	{
		title: "Due Today",
		params: { section: "due-today", sort: "dueDate.asc" },
	},
	{
		title: "Past Due",
		params: { section: "past-due", sort: "dueDate.asc" },
	},
	{
		title: "Completed",
		params: { section: "completed", sort: "deliveredAt.desc" },
	},
	{ title: "All", params: { section: null }, clearQuery: true },
	{ title: "Calendar", params: { section: "calendar" } },
	{ title: "Drivers", params: { section: "drivers" } },
	{ title: "Exceptions", params: { section: "exceptions" } },
] satisfies PageTabItem[];
