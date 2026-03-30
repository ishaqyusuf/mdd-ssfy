import { capitalize } from "lodash";
import SalesOverviewClient from "../_components/sales-overview-client";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata(props) {
	const params = await props.params;
	const [type, slug] = params.typeAndSlug;
	const title = capitalize(`${type} | ${slug}`);
	return {
		title,
	};
}
export default async function Page(props) {
	const params = await props.params;
	const [type, slug] = params.typeAndSlug;

	return (
		<PageShell>
			<PageTitle>{`${capitalize(`${type} | ${slug}`)}`}</PageTitle>
			<SalesOverviewClient />
		</PageShell>
	);
}
