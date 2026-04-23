"use client";

import { useAuth } from "@/hooks/use-auth";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import type { PageFilterData } from "@api/type";
import { SearchFilter } from "@gnd/ui/search-filter";
import { useQueryStates } from "nuqs";
import { _trpc } from "./static-trpc";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function OrderSearchFilter({ initialFilterList }: Props) {
	const [filters, setFilters] = useQueryStates(salesFilterParamsSchema);
	const auth = useAuth();
	return (
		<SearchFilter
			filterSchema={salesFilterParamsSchema}
			initialFilterList={initialFilterList}
			placeholder="Search Order Information..."
			trpcRoute={_trpc.filters.salesOrders}
			trpQueryOptions={{
				salesManager: auth?.can?.viewSalesManager,
			}}
			{...{ filters, setFilters }}
		/>
	);
}
