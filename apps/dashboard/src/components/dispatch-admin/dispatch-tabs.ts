import type { PageTabItem } from "@/components/page-tabs";

export const dispatchAdminPageTabs = [
	{ title: "Dashboard", params: { section: "dashboard" } },
	{ title: "Backlog", params: { section: "backlog" } },
	{ title: "Dispatches", params: { section: "dispatches" } },
	{ title: "Calendar", params: { section: "calendar" } },
	{ title: "Drivers", params: { section: "drivers" } },
	{ title: "Exceptions", params: { section: "exceptions" } },
] satisfies PageTabItem[];
