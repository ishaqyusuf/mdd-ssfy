import { NewSalesForm } from "@/components/forms/new-sales-form/new-sales-form";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata(props) {
	const params = await props.params;
	return constructMetadata({
		title: `Edit Quote | ${params.slug} - gndprodesk.com`,
	});
}

export default async function Page(props) {
	const params = await props.params;
	return (
		<PageShell>
			<PageTitle>{`Edit Quote | ${params.slug}`}</PageTitle>
			<NewSalesForm mode="edit" type="quote" slug={params.slug} />
		</PageShell>
	);
}
