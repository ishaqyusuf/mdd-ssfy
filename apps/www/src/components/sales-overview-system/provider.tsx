"use client";

import type { ReactNode } from "react";

import { useSalesOverviewV2PageQuery } from "@/hooks/use-sales-overview-v2-page-query";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";
import { useTRPC } from "@/trpc/client";
import createContextFactory from "@/utils/context-factory";

import { useQuery } from "@gnd/ui/tanstack";

import { normalizeSalesOverviewTab } from "./controller";
import type { SalesOverviewSurface } from "./types";

const {
	Provider: SalesOverviewSystemContextProvider,
	useContext: useSalesOverviewSystem,
} = createContextFactory(
	({
		surface,
	}: {
		surface: SalesOverviewSurface;
	}) => {
		const pageQuery = useSalesOverviewV2PageQuery();
		const sheetQuery = useSalesOverviewV2SheetQuery();
		const query = surface === "page" ? pageQuery : sheetQuery;
		const overviewId =
			surface === "page"
				? query.params["sales-overview-v2-id"]
				: query.params["sales-overview-v2-sheet-id"];
		const salesType =
			surface === "page"
				? query.params["sales-overview-v2-type"]
				: query.params["sales-overview-v2-sheet-type"];
		const currentTab =
			surface === "page"
				? query.params["sales-overview-v2-tab"]
				: query.params["sales-overview-v2-sheet-tab"];
		const trpc = useTRPC();
		const { data } = useQuery(
			trpc.sales.getSaleOverview.queryOptions(
				{
					orderNo: overviewId,
					salesType: salesType === "quote" ? "quote" : "order",
				},
				{
					enabled: !!overviewId,
				},
			),
		);
		const prodQty =
			data?.salesStat?.prodAssigned?.total ?? data?.stats?.prodAssigned?.total;
		const normalizedTab = normalizeSalesOverviewTab(currentTab);
		const title = [data?.orderId, data?.displayName]
			.filter(Boolean)
			.join(" | ");

		return {
			surface,
			query,
			overviewId,
			currentTab: normalizedTab || "overview",
			data,
			prodQty: prodQty || 0,
			isQuote: data?.type === "quote",
			title,
		};
	},
);

export function SalesOverviewSystemProvider({
	surface,
	children,
}: {
	surface: SalesOverviewSurface;
	children: ReactNode;
}) {
	return (
		<SalesOverviewSystemContextProvider args={[{ surface }]}>
			{children}
		</SalesOverviewSystemContextProvider>
	);
}

export { useSalesOverviewSystem };
