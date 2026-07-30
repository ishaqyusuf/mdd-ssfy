"use client";

import { PageTabs } from "@/components/page-tabs";
import { SalesFinanceAdoptionStatus } from "@/components/sales-finance/adoption";
import { salesFinancePageTabs } from "@/components/sales-finance/tabs";
import { SalesResolutionColumnVisibility } from "@/components/tables-2/sales-resolution/column-visibility";
import { resolutionCenterFilterParamsSchema } from "@/hooks/use-resolution-center-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

import { SearchFilterTRPC } from "../midday-search-filter/search-filter-trpc";

export function SalesFinanceResolutionHeader() {
	return (
		<div className="min-w-0">
			<SearchFilterProvider
				args={[{ filterSchema: resolutionCenterFilterParamsSchema }]}
			>
				<SalesFinanceResolutionHeaderContent />
			</SearchFilterProvider>
		</div>
	);
}

function SalesFinanceResolutionHeaderContent() {
	const trpc = useTRPC();
	const { shouldFetch } = useSearchFilterContext();
	const { data: filterList, isFetching } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.salesResolutions.queryOptions(),
	});

	return (
		<SearchFilterTRPC
			placeholder="Search invoice, customer, or account..."
			filterList={filterList}
			loading={shouldFetch && isFetching}
			pageTabs={
				<PageTabs
					portal={false}
					tabs={salesFinancePageTabs}
					maxVisible={{ base: 4, lg: 4, "2xl": 4 }}
				/>
			}
			toolbarActions={
				<>
					<SalesFinanceAdoptionStatus />
					<SalesResolutionColumnVisibility />
				</>
			}
		/>
	);
}
