"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewV2PageQuery } from "@/hooks/use-sales-overview-v2-page-query";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";
import { useTRPC } from "@/trpc/client";
import createContextFactory from "@/utils/context-factory";

import { useSession } from "@/lib/auth/client";
import { useQuery } from "@gnd/ui/tanstack";

import {
	normalizeSalesOverviewTab,
	resolveSalesOverviewAccessView,
} from "./controller";
import { getProductionTabItemCount } from "./lib/production-items";
import type {
	SalesOverviewContextValue,
	SalesOverviewData,
	SalesOverviewSurface,
	SalesOverviewTabId,
} from "./types";

const {
	Provider: SalesOverviewSystemContextProvider,
	useContext: useSalesOverviewSystem,
} = createContextFactory(
	({
		surface,
	}: {
		surface: SalesOverviewSurface;
	}): SalesOverviewContextValue => {
		const pageQuery = useSalesOverviewV2PageQuery();
		const sheetQuery = useSalesOverviewV2SheetQuery();
		const auth = useAuth();
		const overviewId =
			surface === "page"
				? pageQuery.params.overviewId
				: sheetQuery.params.overviewSheetId;
		const salesType =
			surface === "page"
				? pageQuery.params.overviewType
				: sheetQuery.params.overviewSheetType;
		const mode =
			surface === "page"
				? pageQuery.params.overviewMode
				: sheetQuery.params.overviewSheetMode;
		const currentTab =
			surface === "page"
				? pageQuery.params.overviewTab
				: sheetQuery.params.overviewSheetTab;
		const dispatchId =
			surface === "page"
				? pageQuery.params.dispatchId
				: sheetQuery.params.overviewSheetDispatchId;
		const trpc = useTRPC();
		const { status } = useSession();
		const { data, isPending } = useQuery(
			trpc.sales.getSaleOverview.queryOptions(
				{
					orderNo: overviewId,
					salesType: salesType === "quote" ? "quote" : "order",
				},
				{
					enabled: !!overviewId && status === "authenticated",
				},
			),
		);
		const overviewData = data as SalesOverviewData | null | undefined;
		const normalizedTab = normalizeSalesOverviewTab(currentTab);
		const isAdmin = !!auth?.can?.viewOrders;
		const accessView = resolveSalesOverviewAccessView({
			isAdmin,
			mode,
			canProduction: !!auth?.can?.viewProduction && !auth?.can?.viewOrders,
			canDispatch: !!auth?.can?.viewDelivery && !auth?.can?.viewOrders,
		});
		const { data: productionOverview } = useQuery(
			trpc.sales.productionOverview.queryOptions(
				{
					salesNo: overviewId,
					assignedToId:
						accessView === "production" && !isAdmin
							? Number(auth?.id || 0)
							: null,
				},
				{
					enabled:
						!!overviewId && salesType !== "quote" && status === "authenticated",
				},
			),
		);
		const prodQty = getProductionTabItemCount(productionOverview?.items);
		const title = [data?.orderId, data?.displayName]
			.filter(Boolean)
			.join(" | ");
		const setCurrentTab = (tab: SalesOverviewTabId) => {
			if (surface === "page") {
				pageQuery.setParams({
					overviewTab: tab,
				});
				return;
			}

			sheetQuery.setParams({
				overviewSheetTab: tab,
			});
		};

		return {
			state: {
				surface,
				overviewId: overviewId || null,
				dispatchId: dispatchId || null,
				currentTab: normalizedTab || "overview",
				accessView,
				isAdmin,
				auth,
				mode,
				data: overviewData,
				prodQty: prodQty || 0,
				isQuote: data?.type === "quote",
				title,
			},
			actions: {
				setCurrentTab,
				close: () => {
					if (surface === "page") pageQuery.close();
					else sheetQuery.close();
				},
			},
			meta: {
				isLoading: isPending,
				hasOverview: !!overviewId,
			},
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
