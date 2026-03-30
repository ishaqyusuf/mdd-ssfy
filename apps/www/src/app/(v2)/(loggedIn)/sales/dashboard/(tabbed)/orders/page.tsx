import type { Metadata } from "next";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import {
	SalesQueryParams,
	getSalesAction,
} from "../../_actions/get-sales-action";
import PageClient from "../../_components/page-client";

export const metadata: Metadata = {
	title: "Sales",
};
// export type SalesPageType =
//     | "orders"
//     | "delivery"
//     | "pickup"
//     | "quotes"
//     | "productions";
interface Props {
	searchParams: Promise<SalesQueryParams>;
	params;
}
export default async function SalesPage(props: Props) {
	const searchParams = await props.searchParams;
	const promise = getSalesAction({
		...searchParams,
		type: "order",
	});

	return (
		<PageShell>
			<PageTitle>{"Sales"}</PageTitle>
			<PageClient createType="order" type="orders" response={promise} />
		</PageShell>
	);
}
