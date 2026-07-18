"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import { useEmployeeParams } from "@/hooks/use-employee-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filters, setFilters, hasFilters } = useEmployeeFilterParams();
	const { setParams } = useEmployeeParams();

	return (
		<CoreEmptyState
			title={
				filters.accessStatus === "revoked"
					? "No revoked employees"
					: "No employees"
			}
			description="Employees will appear here after they are created."
			actionLabel={hasFilters ? "Clear filters" : "Create Employee"}
			onAction={() => {
				if (hasFilters) {
					setFilters(clearFilters(filters));
					return;
				}

				setParams({
					createEmployee: true,
				});
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useEmployeeFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
