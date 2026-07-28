"use client";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { RecentSalesList } from "./recent-sales-list";
import { RECENT_SALES_QUERY_INPUT } from "./recent-sales-query";

export function RecentSalesPanel() {
	const trpc = useTRPC();
	const overviewQuery = useSalesOverviewQuery();
	const { data } = useSuspenseInfiniteQuery(
		trpc.sales.getOrders.infiniteQueryOptions(RECENT_SALES_QUERY_INPUT, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	);
	const orders =
		data.pages[0]?.data.slice(0, RECENT_SALES_QUERY_INPUT.size) ?? [];

	return (
		<RecentSalesList
			orders={orders}
			onOpen={(orderUuid) => overviewQuery.open2(orderUuid, "sales")}
		/>
	);
}
