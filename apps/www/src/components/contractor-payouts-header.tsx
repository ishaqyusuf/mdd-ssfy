"use client";

import { contractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
import { Search } from "lucide-react";
import { useQueryStates } from "nuqs";

import { Input } from "@gnd/ui/input";

export function ContractorPayoutsHeader() {
	const [filters, setFilters] = useQueryStates(contractorPayoutFilterParams);

	return (
		<div className="flex items-center gap-4">
			<div className="relative w-full max-w-md">
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					className="pl-9"
					placeholder="Search payouts, contractor, payer, method, or check no..."
					value={filters.q || ""}
					onChange={(event) => {
						setFilters({
							q: event.target.value || null,
						});
					}}
				/>
			</div>
		</div>
	);
}
