export const customerOverviewTabs = ["overview", "quotes", "orders"] as const;
export type CustomerOverviewTab = (typeof customerOverviewTabs)[number];

export function isCustomerOverviewTab(
	value: string | null | undefined,
): value is CustomerOverviewTab {
	return customerOverviewTabs.includes(value as CustomerOverviewTab);
}

export function resolveCustomerOverviewTab(
	value: string | null | undefined,
): CustomerOverviewTab {
	return isCustomerOverviewTab(value) ? value : "overview";
}
