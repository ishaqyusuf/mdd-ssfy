import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { SalesOverviewSystemRouteEntry } from "@/components/sales-overview-system/route-entry";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Overview V2 | GND",
	});
}

export default function SalesOverviewV2Page() {
	return (
		<FPage can={["viewOrders"]} title="Sales Overview V2">
			<SalesOverviewSystemRouteEntry />
		</FPage>
	);
}
