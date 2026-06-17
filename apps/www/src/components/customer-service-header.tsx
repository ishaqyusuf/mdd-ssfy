"use client";

import { customerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenCustomerServiceSheet } from "./open-customer-service-sheet";
import { CustomerServiceColumnVisibility } from "./tables-2/customer-service/column-visibility";

export function CustomerServiceHeader() {
	const trpc = useTRPC();

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div className="min-w-0 flex-1">
				<SearchFilter
					filterSchema={customerServiceFilterParams}
					placeholder="Search CustomerServices..."
					trpcRoute={trpc.filters.customerService}
				/>
			</div>
			<div className="flex shrink-0 items-center justify-end gap-2">
				<CustomerServiceColumnVisibility />
				<OpenCustomerServiceSheet />
			</div>
		</div>
	);
}
