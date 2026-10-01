import PageShell from "@/components/page-shell";
import { PaymentOverviewPage } from "@/components/payment-dashboard/payment-overview-page";
import { ScrollableContent } from "@/components/scrollable-content";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ paymentId: string }>;
}) {
	const { paymentId } = await params;

	return constructMetadata({
		title: `Payout #${paymentId} | GND`,
	});
}

export default async function ContractorPaymentOverviewRoute({
	params,
}: {
	params: Promise<{ paymentId: string }>;
}) {
	const { paymentId } = await params;
	const numericPaymentId = Number(paymentId);
	const includedJobsInitialSettings = await getInitialTableSettings(
		"contractor-payout-overview-jobs",
	);

	await batchPrefetch([
		trpc.jobs.contractorPayoutOverview.queryOptions({
			paymentId: numericPaymentId,
		}),
	]);

	return (
		<PageShell className="min-w-0 p-4 sm:p-6">
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Payout receipt</PageTitle>
					<PaymentOverviewPage
						paymentId={numericPaymentId}
						includedJobsInitialSettings={includedJobsInitialSettings}
					/>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
