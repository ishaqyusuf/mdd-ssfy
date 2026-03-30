import { getDealersAction } from "./action";
import PageClient from "./page-client";
import PageTabsServer from "./page-tabs-server";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export default async function DealersPage(props) {
	const searchParams = await props.searchParams;
	const resp = getDealersAction(searchParams);

	return (
		<PageShell>
			<PageTitle>Dealers</PageTitle>
			<PageTabsServer />
			<PageClient response={resp} />
		</PageShell>
	);
}
