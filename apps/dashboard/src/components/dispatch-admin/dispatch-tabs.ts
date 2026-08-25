import type { PageTabItem } from "@/components/page-tabs";

export const dispatchAdminPageTabs = [
	{ title: "Backlog", params: { section: "backlog" } },
	{ title: "Calendar", params: { section: "calendar" } },
	{ title: "Drivers", params: { section: "drivers" } },
	{ title: "Exceptions", params: { section: "exceptions" } },
] satisfies PageTabItem[];
