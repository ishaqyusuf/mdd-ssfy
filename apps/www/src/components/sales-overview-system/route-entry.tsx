"use client";

import { SalesOverviewSystem } from "@/components/sales-overview-system";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function SalesOverviewSystemRouteEntry() {
	const query = useSalesOverviewQuery();

	if (!query["sales-overview-id"]) {
		return (
			<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
				Open this page with a sales overview query, for example
				<code className="ml-1 rounded bg-muted px-1 py-0.5">
					?sales-overview-id=ORDER_NO&sales-type=order&mode=sales&salesTab=general
				</code>
			</div>
		);
	}

	return <SalesOverviewSystem surface="page" />;
}
