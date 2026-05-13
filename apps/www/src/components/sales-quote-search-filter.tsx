"use client";

import { useAuth } from "@/hooks/use-auth";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { PageFilterData } from "@api/type";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function SalesQuoteSearchFilter({ initialFilterList }: Props) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: salesFilterParamsSchema,
				},
			]}
		>
			<Content initialFilterList={initialFilterList} />
		</SearchFilterProvider>
	);
}

function Content({ initialFilterList }: Props) {
	const auth = useAuth();
	const trpc = useTRPC();
	const { data: trpcFilterData } = useQuery({
		...trpc.filters.salesQuotes.queryOptions({
			salesManager: auth?.can?.viewSalesManager,
		}),
		initialData: initialFilterList as RouterOutputs["filters"]["salesQuotes"],
	});

	return (
		<SearchFilterTRPC
			commitMode="submit"
			placeholder="Search quote information..."
			filterList={trpcFilterData}
		/>
	);
}
