import { NewSalesForm } from "@/components/forms/new-sales-form/new-sales-form";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata() {
	return constructMetadata({
		title: "Create Quote - gndprodesk.com",
	});
}

export default async function Page() {
	unstable_noStore();
	const queryClient = getQueryClient();
	await Promise.all([
		queryClient.fetchQuery(
			trpc.newSalesForm.bootstrap.queryOptions({
				type: "quote",
				customerId: null,
			}),
		),
		queryClient.fetchQuery(trpc.newSalesForm.getStepRouting.queryOptions({})),
		queryClient.fetchQuery(trpc.customers.getCustomerProfiles.queryOptions()),
		queryClient.fetchQuery(trpc.customers.getTaxProfiles.queryOptions()),
		queryClient.fetchQuery(trpc.sales.getSuppliers.queryOptions({})),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Create Quote</PageTitle>
				<NewSalesForm mode="create" type="quote" />
			</HydrateClient>
		</PageShell>
	);
}
