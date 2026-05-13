"use client";

import { customerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenCustomerServiceSheet } from "./open-customer-service-sheet";
import { _trpc } from "./static-trpc";

export function CustomerServiceHeader() {
	return (
		<div className="flex justify-between">
			<SearchFilter
				filterSchema={customerServiceFilterParams}
				placeholder="Search CustomerServices..."
				trpcRoute={_trpc.filters.customerService}
			/>
			<div className="flex-1" />
			<OpenCustomerServiceSheet />
		</div>
	);
}
