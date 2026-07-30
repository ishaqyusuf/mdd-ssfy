import type { PageTabItem } from "@/components/page-tabs";

export const salesFinancePageTabs = [
	{
		title: "Review queue",
		params: { tab: "review" },
	},
	{
		title: "Receivables",
		params: { tab: "receivables" },
	},
	{
		title: "Resolution Center",
		params: { tab: "resolution" },
	},
] satisfies PageTabItem[];
