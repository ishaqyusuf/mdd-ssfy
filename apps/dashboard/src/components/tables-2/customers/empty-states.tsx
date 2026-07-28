"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useCustomerFilterParams } from "@/hooks/use-customer-filter-params";

export function EmptyState() {
	const { setParams } = useCreateCustomerParams();

	return (
		<CoreEmptyState
			title="No customers"
			description="Create a customer to start tracking sales and account activity."
			actionLabel="Create customer"
			onAction={() => {
				setParams({
					customerForm: true,
					customerId: null,
					addressId: null,
					address: null,
				});
			}}
		/>
	);
}

export function NoResults() {
	const { filter, setFilter } = useCustomerFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilter(
					Object.fromEntries(
						Object.keys(filter).map((key) => [key, null]),
					) as typeof filter,
				);
			}}
		/>
	);
}
