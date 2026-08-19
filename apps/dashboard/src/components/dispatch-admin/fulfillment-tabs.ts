import type { PageTabItem } from "@/components/page-tabs";

export const fulfillmentPageTabs = [
	{ title: "All", params: { tab: "all", status: null } },
	{ title: "Completed", params: { tab: "completed", status: null } },
] satisfies PageTabItem[];
