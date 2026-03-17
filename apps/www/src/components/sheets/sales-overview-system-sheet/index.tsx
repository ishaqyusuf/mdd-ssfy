"use client";

import { SalesOverviewSystem } from "@/components/sales-overview-system";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";

export default function SalesOverviewSystemSheet() {
	const query = useSalesOverviewV2SheetQuery();
	const overviewId = query.params["sales-overview-v2-sheet-id"];

	return overviewId ? (
		<SalesOverviewSystem surface="sheet" onSheetClose={query.close} />
	) : null;
}
