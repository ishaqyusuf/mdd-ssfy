"use client";

import { SearchFilterTRPC } from "@/components/midday-search-filter/search-filter-trpc";
import { PageTabs } from "@/components/page-tabs";
import {
	driverDashboardSearchParamsSchema,
	useDriverDashboardParams,
} from "@/hooks/use-driver-dashboard-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";

const driverTabs = [
	{ title: "Today", params: { view: "today" } },
	{ title: "All stops", params: { view: "all" } },
	{ title: "Exceptions", params: { view: "exceptions" } },
	{ title: "Completed", params: { view: "completed" } },
];

export function DriverDashboardSearchFilter() {
	const { params } = useDriverDashboardParams();

	return (
		<SearchFilterProvider
			args={[{ filterSchema: driverDashboardSearchParamsSchema }]}
		>
			<SearchFilterTRPC
				placeholder="Search stops, orders, customers, or addresses..."
				filterList={[{ key: "q", label: "Search", type: "search" }]}
				pageTabs={
					<PageTabs
						className="w-full lg:w-[390px]"
						fixedTabs={driverTabs}
						portal={false}
						showAll={false}
						tabs={[]}
						activeParams={{ view: params.view }}
						maxVisible={{ base: 4, lg: 4, "2xl": 4 }}
					/>
				}
			/>
		</SearchFilterProvider>
	);
}
