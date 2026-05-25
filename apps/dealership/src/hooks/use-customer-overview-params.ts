"use client";

import {
	type CustomerOverviewTab,
	customerOverviewTabs,
	resolveCustomerOverviewTab,
} from "@/lib/customer-overview-tabs";
import { parseAsInteger, parseAsStringEnum, useQueryStates } from "nuqs";

export { customerOverviewTabs, resolveCustomerOverviewTab };
export type { CustomerOverviewTab };

export function useCustomerOverviewParams() {
	const [params, setParams] = useQueryStates({
		customerOverviewId: parseAsInteger,
		customerOverviewTab: parseAsStringEnum([...customerOverviewTabs]),
	});
	const customerId = params.customerOverviewId;

	return {
		params,
		setParams,
		customerId,
		opened: Boolean(customerId),
		activeTab: resolveCustomerOverviewTab(params.customerOverviewTab),
		open(customerId: number, tab: CustomerOverviewTab = "overview") {
			setParams({
				customerOverviewId: customerId,
				customerOverviewTab: tab,
			});
		},
		setTab(tab: CustomerOverviewTab) {
			setParams({
				customerOverviewTab: tab,
			});
		},
		close() {
			setParams({
				customerOverviewId: null,
				customerOverviewTab: null,
			});
		},
	};
}
