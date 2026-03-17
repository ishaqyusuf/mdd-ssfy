"use client";

import { SalesOverviewSystem } from "@/components/sales-overview-system";
import { useSalesOverviewV2PageQuery } from "@/hooks/use-sales-overview-v2-page-query";

import { useSyncLegacySalesOverviewQuery } from "./use-sync-legacy-query";

export function SalesOverviewSystemRouteEntry() {
	const query = useSalesOverviewV2PageQuery();
	const overviewId = query.params["sales-overview-v2-id"];

	useSyncLegacySalesOverviewQuery({
		id: overviewId,
		salesType: query.params["sales-overview-v2-type"],
		mode: query.params["sales-overview-v2-mode"],
		tab: query.params["sales-overview-v2-tab"],
		active: !!overviewId,
	});

	if (!overviewId) {
		return (
			<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
				Open this page with a sales overview query, for example
				<code className="ml-1 rounded bg-muted px-1 py-0.5">
					?sales-overview-v2-id=ORDER_NO&sales-overview-v2-type=sales&sales-overview-v2-mode=sales&sales-overview-v2-tab=general
				</code>
			</div>
		);
	}

	return <SalesOverviewSystem surface="page" />;
}
