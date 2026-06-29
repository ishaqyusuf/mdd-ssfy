import { _trpc } from "@/components/static-trpc";
import {
	adaptSalesOrderListResponse,
	buildSalesDocumentListQueryInput,
} from "@/features/sales/components/sales-document-list";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type SalesOrdersQueryInput = Parameters<
	typeof _trpc.sales.getOrders.queryOptions
>[0];

export function useSalesOrdersList(input: {
	q?: string;
	filters?: Record<string, string | null | undefined>;
}) {
	const q = useDebounce((input.q || "").trim(), 350);

	const queryInput = useMemo(() => {
		return buildSalesDocumentListQueryInput({
			type: "order",
			q,
			filters: input.filters,
		});
	}, [input.filters, q]);

	const query = useQuery(
		_trpc.sales.getOrders.queryOptions(queryInput as SalesOrdersQueryInput),
	);

	const data = useMemo(
		() => adaptSalesOrderListResponse(query.data),
		[query.data],
	);

	return {
		...query,
		data,
	};
}
