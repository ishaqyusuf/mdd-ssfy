import { LazyPaymentPortal } from "@/components/payment-dashboard/lazy-payment-dashboard";
import { ScrollableContent } from "@/components/scrollable-content";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payment Portal | GND",
	});
}

export default async function ContractorsPaymentPortalPage() {
	const paymentPortalJobsInitialSettings = await getInitialTableSettings(
		"payment-portal-jobs",
	);

	batchPrefetch([trpc.jobs.paymentDashboard.queryOptions({})]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Contractor Payment Portal</PageTitle>
					<LazyPaymentPortal
						paymentPortalJobsInitialSettings={paymentPortalJobsInitialSettings}
					/>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
