"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filters, setFilters } = useCustomerServiceFilterParams();
	const { setParams } = useCustomerServiceParams();
	const hasFilters = Object.values(filters).some((value) => value !== null);

	return (
		<CoreEmptyState
			title="No customer service work orders"
			description="Work orders will appear here after they are created."
			actionLabel={hasFilters ? "Clear filters" : "Create Work Order"}
			onAction={() => {
				if (hasFilters) {
					setFilters(clearFilters(filters));
					return;
				}

				setParams({
					openCustomerServiceId: -1,
				});
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useCustomerServiceFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
