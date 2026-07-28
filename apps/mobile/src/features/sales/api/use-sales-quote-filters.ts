import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";

export function useSalesQuoteFilters() {
	return useQuery(
		_trpc.filters.salesQuotes.queryOptions({
			salesManager: true,
		}),
	);
}
