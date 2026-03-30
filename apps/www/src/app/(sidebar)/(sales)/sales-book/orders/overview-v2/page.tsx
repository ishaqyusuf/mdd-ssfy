import { SalesOverviewSystemRouteEntry } from "@/components/sales-overview-system/route-entry";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Overview V2 | GND",
	});
}

export default function SalesOverviewV2Page() {
	return (
		<PageShell>
			<PageTitle>Sales Overview V2</PageTitle>
			<SalesOverviewSystemRouteEntry />
		</PageShell>
	);
}
