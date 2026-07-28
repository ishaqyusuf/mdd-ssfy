"use client";

import { EmptyState } from "@/components/empty-state";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SalesList } from "./sales-list";

export function CustomerQuotesTab({ accountNo }) {
	const trpc = useTRPC();
	const [prefix, id] = accountNo?.split("-") || [];

	const quotesQuery = useQuery(
		trpc.sales.quotes.queryOptions(
			{
				salesType: "quote",
				size: 200,
				...(prefix === "cust"
					? { customerId: Number(id) }
					: { phone: accountNo }),
			},
			{
				enabled: !!accountNo,
				staleTime: 60_000,
			},
		),
	);
	const data = quotesQuery.data?.data ?? [];

	return (
		<div className="space-y-4">
			<EmptyState empty={!quotesQuery.isPending && data.length === 0}>
				<SalesList data={data} loading={quotesQuery.isPending} />
			</EmptyState>
		</div>
	);
}
