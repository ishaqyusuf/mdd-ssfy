import type { PageTabItem } from "@/components/page-tabs";

export const contractorAccountingPageTabs = [
	{ title: "Ledger", params: { tab: "ledger" } },
	{ title: "Payables", params: { tab: "payables" } },
	{ title: "Review queue", params: { tab: "review" } },
	{ title: "Resolution Center", params: { tab: "resolution" } },
] satisfies PageTabItem[];
