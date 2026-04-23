import { NewSalesForm } from "@/components/forms/new-sales-form/new-sales-form";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import type { SearchParams } from "nuqs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Create Order - gndprodesk.com",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	unstable_noStore();
	const searchParams = await props.searchParams;
	const selectedCustomerId =
		typeof searchParams.selectedCustomerId === "string"
			? Number(searchParams.selectedCustomerId)
			: Array.isArray(searchParams.selectedCustomerId)
				? Number(searchParams.selectedCustomerId[0])
				: null;
	const customerId =
		selectedCustomerId && Number.isFinite(selectedCustomerId)
			? selectedCustomerId
			: null;
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(
		trpc.newSalesForm.bootstrap.queryOptions({
			type: "order",
			customerId,
		}),
	);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Create Order</PageTitle>
				<NewSalesForm mode="create" type="order" />
			</HydrateClient>
		</PageShell>
	);
}
