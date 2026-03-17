"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewV2PageQuery } from "@/hooks/use-sales-overview-v2-page-query";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";
import { useTRPC } from "@/trpc/client";
import createContextFactory from "@/utils/context-factory";

import { useQuery } from "@gnd/ui/tanstack";

import {
	normalizeSalesOverviewTab,
	resolveSalesOverviewAccessView,
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
		const pageQuery = useSalesOverviewV2PageQuery();
		const sheetQuery = useSalesOverviewV2SheetQuery();
		const query = surface === "page" ? pageQuery : sheetQuery;
		const auth = useAuth();
		const overviewId =
			surface === "page"
				? query.params.overviewId
				: query.params.overviewSheetId;
		const salesType =
			surface === "page"
				? query.params.overviewType
				: query.params.overviewSheetType;
		const mode =
			surface === "page"
				? query.params.overviewMode
				: query.params.overviewSheetMode;
		const currentTab =
			surface === "page"
				? query.params.overviewTab
				: query.params.overviewSheetTab;
		const dispatchId =
			surface === "page"
				? query.params.dispatchId
				: query.params.overviewSheetDispatchId;
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
		const isAdmin = !!auth?.can?.viewOrders;
		const accessView = resolveSalesOverviewAccessView({
			isAdmin,
			mode,
			canProduction: !!auth?.can?.viewProduction && !auth?.can?.viewOrders,
			canDispatch: !!auth?.can?.viewDelivery && !auth?.can?.viewOrders,
		});
		const title = [data?.orderId, data?.displayName]
			.filter(Boolean)
			.join(" | ");

		return {
			surface,
			query,
			overviewId,
			dispatchId,
			currentTab: normalizedTab || "overview",
			accessView,
			isAdmin,
			auth,
			mode,
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
