import { CustomerFormClient } from "@/components/customer-form-client";
import { DealershipShell } from "@/components/dealership-shell";
import PageShell from "@/components/page-shell";
import { requireDealer } from "@/lib/dealer-session";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
	const { dealer } = await requireDealer();
	batchPrefetch([trpc.dealerPortal.salesProfiles.queryOptions()]);

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<HydrateClient>
					<PageTitle>Create Customer</PageTitle>
					<CustomerFormClient />
				</HydrateClient>
			</PageShell>
		</DealershipShell>
	);
}
