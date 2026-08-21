import type {
	FetchQueryOptions,
	QueryClient,
	QueryKey,
} from "@tanstack/react-query";

export function fetchFreshTerminalPaymentStatus<
	TQueryFnData,
	TError = Error,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	queryClient: QueryClient,
	options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) {
	return queryClient.fetchQuery({
		...options,
		staleTime: 0,
	});
}

export function getCompletedTerminalSaleReferences(
	formSales: { id: number; selected: boolean }[],
	pendingSales: { id?: number | null; orderId?: string | null }[],
) {
	const salesIds = formSales
		.filter((sale) => sale.selected)
		.map((sale) => sale.id);
	const selectedSalesIds = new Set(salesIds);

	return {
		salesIds,
		orderNos: pendingSales.flatMap((sale) =>
			typeof sale.id === "number" &&
			sale.orderId &&
			selectedSalesIds.has(sale.id)
				? [sale.orderId]
				: [],
		),
	};
}
