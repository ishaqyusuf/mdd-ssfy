"use client";

import { SearchFilterTRPC } from "@/components/midday-search-filter/search-filter-trpc";
import { driverDashboardSearchParamsSchema } from "@/hooks/use-driver-dashboard-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";

export function DriverDashboardSearchFilter() {
	return (
		<SearchFilterProvider
			args={[{ filterSchema: driverDashboardSearchParamsSchema }]}
		>
			<SearchFilterTRPC
				placeholder="Search stops, orders, customers, or addresses..."
				filterList={[{ key: "q", label: "Search", type: "search" }]}
				pageTabs={null}
			/>
		</SearchFilterProvider>
	);
}
