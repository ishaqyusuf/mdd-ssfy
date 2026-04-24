import { NewSalesForm } from "@/components/forms/new-sales-form/new-sales-form";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	const params = await props.params;
	return constructMetadata({
		title: `Edit Quote | ${params.slug} - gndprodesk.com`,
	});
}

export default async function Page(props) {
	const params = await props.params;
	const slug = params.slug;

	return (
		<PageShell>
			<PageTitle>{`Edit Quote | ${slug}`}</PageTitle>
			<Suspense fallback={<SalesFormLoading />}>
				<PrefetchedEditQuoteForm slug={slug} />
			</Suspense>
		</PageShell>
	);
}

async function PrefetchedEditQuoteForm({ slug }: { slug: string }) {
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(
		trpc.newSalesForm.get.queryOptions({
			type: "quote",
			slug,
		}),
	);
	return (
		<HydrateClient>
			<NewSalesForm mode="edit" type="quote" slug={slug} />
		</HydrateClient>
	);
}

function SalesFormLoading() {
	return (
		<div className="rounded-lg border p-8 text-sm text-muted-foreground">
			Loading sales form...
		</div>
	);
}
