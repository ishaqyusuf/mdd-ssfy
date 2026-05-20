import { CustomerFormClient } from "@/components/customer-form-client";
import { DealershipShell } from "@/components/dealership-shell";
import PageShell from "@/components/page-shell";
import { requireDealer } from "@/lib/dealer-session";
import { HydrateClient, batchPrefetch, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const customerId = Number(id);
	if (!Number.isFinite(customerId)) notFound();
	const { dealer } = await requireDealer();
	const queryClient = getQueryClient();
	const customer = await queryClient.fetchQuery(
		trpc.dealerPortal.customer.queryOptions({ id: customerId }),
	);

	batchPrefetch([trpc.dealerPortal.salesProfiles.queryOptions()]);

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<HydrateClient>
					<PageTitle>Edit Customer</PageTitle>
					<CustomerFormClient customer={customer} />
				</HydrateClient>
			</PageShell>
		</DealershipShell>
	);
}
