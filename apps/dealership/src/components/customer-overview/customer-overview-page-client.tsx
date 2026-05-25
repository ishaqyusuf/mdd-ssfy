"use client";

import {
	type CustomerOverviewTab,
	customerOverviewTabs,
	resolveCustomerOverviewTab,
} from "@/lib/customer-overview-tabs";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { CustomerOverviewWorkspace } from "./customer-overview-workspace";

export function CustomerOverviewPageClient({
	customerId,
	initialTab,
}: {
	customerId: number;
	initialTab?: string | null;
}) {
	const [tab, setTab] = useQueryState(
		"customerOverviewTab",
		parseAsStringEnum([...customerOverviewTabs]),
	);
	const activeTab = resolveCustomerOverviewTab(tab || initialTab);

	return (
		<CustomerOverviewWorkspace
			activeTab={activeTab}
			customerId={customerId}
			onTabChange={(nextTab: CustomerOverviewTab) => {
				setTab(nextTab);
			}}
			surface="page"
		/>
	);
}
