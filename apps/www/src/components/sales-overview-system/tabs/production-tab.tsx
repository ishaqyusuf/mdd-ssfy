"use client";

import { useEffect } from "react";

import { EmptyState } from "@/components/empty-state";
import { ProductionTab as LegacyProductionTab } from "@/components/sheets/sales-overview-sheet/production-tab";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import { skeletonListData } from "@/utils/format";

import { Accordion } from "@gnd/ui/accordion";
import { Card, CardHeader } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";

import { useSalesOverviewSystem } from "../provider";

export function SalesOverviewProductionTab() {
	const {
		state: { overviewId, surface },
	} = useSalesOverviewSystem();
	const legacyQuery = useSalesOverviewQuery();

	useEffect(() => {
		if (!overviewId) return;
		if (
			legacyQuery.params["sales-overview-id"] === overviewId &&
			legacyQuery.params.salesTab === "production"
		) {
			return;
		}

		legacyQuery.setParams({
			"sales-overview-id": overviewId,
			"sales-type": "order",
			mode: "sales-production",
			salesTab: "production",
		});
	}, [legacyQuery, overviewId]);

	if (surface === "page") {
		return <ProductionPageFallback />;
	}

	return <LegacyProductionTab />;
}

function ProductionPageFallback() {
	const {
		state: { accessView, auth, currentTab, isAdmin, overviewId },
	} = useSalesOverviewSystem();
	const trpc = useTRPC();
	const { data } = useQuery(
		trpc.sales.productionOverview.queryOptions(
			{
				salesNo: overviewId,
				assignedToId:
					accessView === "production" && !isAdmin
						? Number(auth?.id || 0)
						: null,
			},
			{ enabled: !!overviewId && currentTab === "production" },
		),
	);
	const items =
		data?.items?.filter((item) => item?.itemConfig?.production) || [];

	return (
		<div className="mt-0 space-y-6">
			<Accordion type="multiple" className="space-y-4">
				<EmptyState
					className="h-[70vh]"
					description="No production items found"
					icon="production"
					empty={!!data?.orderId && !items.length}
				/>

				{skeletonListData(items, 5).map((item) => (
					<Card
						key={
							item?.controlUid ||
							`production-page-skeleton-${item?.title ?? item?.subtitle ?? "item"}`
						}
						className="border-border"
					>
						<CardHeader className="space-y-4 px-4 pb-2 pt-4">
							<div className="flex items-start gap-4">
								<div className="flex-1 space-y-1 text-left">
									<h3 className="text-base font-semibold uppercase">
										{item?.title}
									</h3>
									<p className="font-mono$ text-sm font-semibold uppercase text-muted-foreground">
										{item?.subtitle}
									</p>
								</div>
							</div>
						</CardHeader>
					</Card>
				))}
			</Accordion>
		</div>
	);
}
