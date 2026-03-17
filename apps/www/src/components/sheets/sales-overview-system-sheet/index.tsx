"use client";

import { SalesOverviewSystem } from "@/components/sales-overview-system";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export default function SalesOverviewSystemSheet() {
	const query = useSalesOverviewQuery();

	return query["sales-overview-id"] ? (
		<SalesOverviewSystem surface="sheet" />
	) : null;
}
