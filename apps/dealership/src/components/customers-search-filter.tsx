"use client";

import { customersFilterParamsSchema } from "@/hooks/use-customers-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { PageFilterData } from "@api/type";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function CustomersSearchFilter({ initialFilterList }: Props) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: customersFilterParamsSchema,
				},
			]}
		>
			<Content initialFilterList={initialFilterList} />
		</SearchFilterProvider>
	);
}

function Content({ initialFilterList }: Props) {
	const trpc = useTRPC();
	const { data: trpcFilterData } = useQuery({
		...trpc.dealerPortal.customerFilters.queryOptions(),
		initialData:
			initialFilterList as RouterOutputs["dealerPortal"]["customerFilters"],
	});

	return (
		<SearchFilterTRPC
			commitMode="submit"
			placeholder="Search customer information..."
			filterList={trpcFilterData}
		/>
	);
}
