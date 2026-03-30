import { NewSalesForm } from "@/components/forms/new-sales-form/new-sales-form";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata() {
	return constructMetadata({
		title: "Create Quote - gndprodesk.com",
	});
}

export default async function Page() {
	return (
		<PageShell>
			<PageTitle>Create Quote</PageTitle>
			<NewSalesForm mode="create" type="quote" />
		</PageShell>
	);
}
