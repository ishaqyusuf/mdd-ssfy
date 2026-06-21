import { _trpc } from "@/components/static-trpc";
import { buildSalesDocumentListQueryInput } from "@/features/sales/components/sales-document-list";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type SalesQuotesQueryInput = Parameters<
	typeof _trpc.sales.quotes.queryOptions
>[0];

export function useSalesQuotesList(input: {
	q?: string;
	filters?: Record<string, string | null | undefined>;
}) {
	const q = useDebounce((input.q || "").trim(), 350);

	const queryInput = useMemo(() => {
		return buildSalesDocumentListQueryInput({
			type: "quote",
			q,
			filters: input.filters,
		});
	}, [input.filters, q]);

	return useQuery(
		_trpc.sales.quotes.queryOptions(queryInput as SalesQuotesQueryInput),
	);
}
