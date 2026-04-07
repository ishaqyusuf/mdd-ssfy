"use client";

import { contractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { useQueryStates } from "nuqs";

export function ContractorPayoutsHeader() {
	const trpc = useTRPC();
	const [filters, setFilters] = useQueryStates(contractorPayoutFilterParams);

	return (
		<div className="flex items-center gap-4">
			<SearchFilter
				filterSchema={contractorPayoutFilterParams}
				placeholder="Search payouts, contractor, payer, method, or check no..."
				trpcRoute={trpc.filters.contractorPayout}
				{...{ filters, setFilters }}
			/>
		</div>
	);
}
