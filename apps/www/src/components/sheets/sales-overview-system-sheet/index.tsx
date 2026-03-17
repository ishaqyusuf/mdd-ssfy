"use client";

import { SalesOverviewSystem } from "@/components/sales-overview-system";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";

import { useSyncLegacySalesOverviewQuery } from "@/components/sales-overview-system/use-sync-legacy-query";

export default function SalesOverviewSystemSheet() {
	const query = useSalesOverviewV2SheetQuery();
	const overviewId = query.params["sales-overview-v2-sheet-id"];

	useSyncLegacySalesOverviewQuery({
		id: overviewId,
		salesType: query.params["sales-overview-v2-sheet-type"],
		mode: query.params["sales-overview-v2-sheet-mode"],
		tab: query.params["sales-overview-v2-sheet-tab"],
		active: !!overviewId,
	});

	return overviewId ? (
		<SalesOverviewSystem surface="sheet" onSheetClose={query.close} />
	) : null;
}
