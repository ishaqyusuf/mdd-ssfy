import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import PageShell from "@/components/page-shell";
import type { DeliveryOption } from "@/types/sales";
import type { Metadata } from "next";
import SalesTab from "../../_components/sales-tab";
import { getDispatchSales } from "../_actions/get-dispatch-sales";
import PageAction from "../_components/page-action";
import DispatchTableShell from "./dispatch-table-shell";

export const metadata: Metadata = {
	title: "Delivery | GND",
};

export default async function DeliveryPage(props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const type = params.type as DeliveryOption;
	const promise = getDispatchSales({
		...searchParams,
		type,
	});
	return (
		<PageShell>
			<Breadcrumbs>
				<BreadLink isFirst title="Sales" />
				<BreadLink link="/sales/orders" title="Orders" />
				<BreadLink isLast title={type} />
			</Breadcrumbs>
			<SalesTab />
			<PageHeader Action={PageAction} title={type} />
			<DispatchTableShell promise={promise} type={type} />
		</PageShell>
	);
}
