import { LazyPaymentDashboard } from "@/components/payment-dashboard/lazy-payment-dashboard";
import { ScrollableContent } from "@/components/scrollable-content";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payment Dashboard | GND",
	});
}

export default async function ContractorsPaymentDashboardPage() {
	const [contractorQueueInitialSettings, recentPaymentsInitialSettings] =
		await Promise.all([
			getInitialTableSettings("payment-dashboard-contractors"),
			getInitialTableSettings("payment-dashboard-recent-payments"),
		]);

	batchPrefetch([trpc.jobs.paymentDashboard.queryOptions({})]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<LazyPaymentDashboard
						contractorQueueInitialSettings={contractorQueueInitialSettings}
						recentPaymentsInitialSettings={recentPaymentsInitialSettings}
					/>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
