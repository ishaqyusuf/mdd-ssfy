import type { Metadata } from "next";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import {
	SalesQueryParams,
	getSalesAction,
} from "../../_actions/get-sales-action";
import PageClient from "@/app-deps/(v2)/(loggedIn)/sales/dashboard/_components/page-client";
// import PageClient from "@/app-deps/(v2)/(loggedin)/sales/dashboard/(tabbed)/_components/page-client";

export const metadata: Metadata = {
	title: "Sales | GND",
};
export type SalesPageType =
	| "orders"
	| "delivery"
	| "pickup"
	| "quotes"
	| "productions";
interface Props {
	searchParams: Promise<SalesQueryParams>;
	params: Promise<{ type: SalesPageType }>;
}
export default async function SalesPage(props: Props) {
	const searchParams = await props.searchParams;
	const promise = getSalesAction({
		...searchParams,
		type: "quote",
	});

	return (
		<PageShell>
			<PageTitle>Quotes</PageTitle>
			<PageClient createType="quote" type="quotes" response={promise} />
		</PageShell>
	);
}
