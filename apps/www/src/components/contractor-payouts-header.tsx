"use client";

import { contractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function ContractorPayoutsHeader({ initialFilterList }: Props) {
	const trpc = useTRPC();

	return (
		<div className="flex items-center gap-4">
			<SearchFilter
				filterSchema={contractorPayoutFilterParams}
				placeholder="Search payouts, contractor, payer, method, or check no..."
				trpcRoute={trpc.filters.contractorPayout}
				initialFilterList={initialFilterList}
			/>
		</div>
	);
}
