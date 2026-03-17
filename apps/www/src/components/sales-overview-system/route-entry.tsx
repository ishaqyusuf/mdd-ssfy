"use client";

import { SalesOverviewSystem } from "@/components/sales-overview-system";
import { useSalesOverviewV2PageQuery } from "@/hooks/use-sales-overview-v2-page-query";

export function SalesOverviewSystemRouteEntry() {
	const query = useSalesOverviewV2PageQuery();
	const overviewId = query.params.overviewId;

	if (!overviewId) {
		return (
			<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
				Open this page with a sales overview query, for example
				<code className="ml-1 rounded bg-muted px-1 py-0.5">
					?overviewId=ORDER_NO&overviewType=sales&overviewMode=sales&overviewTab=overview
				</code>
			</div>
		);
	}

	return <SalesOverviewSystem surface="page" />;
}
