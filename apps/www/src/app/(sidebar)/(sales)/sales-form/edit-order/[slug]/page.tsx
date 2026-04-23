import { NewSalesForm } from "@/components/forms/new-sales-form/new-sales-form";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	const params = await props.params;
	return constructMetadata({
		title: `Edit Order | ${params.slug} - gndprodesk.com`,
	});
}

export default async function Page(props) {
	const params = await props.params;
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(
		trpc.newSalesForm.get.queryOptions({
			type: "order",
			slug: params.slug,
		}),
	);
	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>{`Edit Order | ${params.slug}`}</PageTitle>
				<NewSalesForm mode="edit" type="order" slug={params.slug} />
			</HydrateClient>
		</PageShell>
	);
}
