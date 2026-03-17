"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import createContextFactory from "@/utils/context-factory";

import {
	SalesOverviewProvider as LegacySalesOverviewProvider,
	useSaleOverview,
} from "../sheets/sales-overview-sheet/context";
import {
	normalizeLegacySalesOverviewTab,
	resolveSalesOverviewAudience,
} from "./controller";
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
		const query = useSalesOverviewQuery();
		const { data } = useSaleOverview();
		const prodQty =
			data?.salesStat?.prodAssigned?.total ?? data?.stats?.prodAssigned?.total;
		const audience = resolveSalesOverviewAudience({
			assignedTo: query.assignedTo,
			viewMode: query.viewMode,
		});
		const normalizedTab = normalizeLegacySalesOverviewTab(
			query.params.salesTab,
		);
		const title = [data?.orderId, data?.displayName]
			.filter(Boolean)
			.join(" | ");

		useEffect(() => {
			if (normalizedTab && normalizedTab !== query.params.salesTab) {
				query.setParams({
					salesTab: normalizedTab,
				});
			}
		}, [normalizedTab, query]);

		return {
			surface,
			audience,
			query,
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
		<LegacySalesOverviewProvider args={[]}>
			<SalesOverviewSystemContextProvider args={[{ surface }]}>
				{children}
			</SalesOverviewSystemContextProvider>
		</LegacySalesOverviewProvider>
	);
}

export { useSalesOverviewSystem };
