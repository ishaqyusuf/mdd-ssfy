import type { SalesOverviewGeneralVersion } from "@gnd/settings";
import { getSaleOverview } from "./sales";
import { getSaleOverviewGeneralV2 } from "./sales-overview-general-v2";

export function getSaleOverviewLoader(
	generalViewVersion: SalesOverviewGeneralVersion,
): typeof getSaleOverview {
	if (generalViewVersion === "v1") return getSaleOverview;

	// Both loaders implement the stable Sales Overview response contract. The V2
	// loader changes database relations, not the response consumed by the sheet.
	return getSaleOverviewGeneralV2 as unknown as typeof getSaleOverview;
}
