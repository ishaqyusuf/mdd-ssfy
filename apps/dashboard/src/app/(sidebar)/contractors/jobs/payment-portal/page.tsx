import { LazyPaymentPortal } from "@/components/payment-dashboard/lazy-payment-dashboard";
import { ScrollableContent } from "@/components/scrollable-content";
import { readJobPaymentContext } from "@/lib/job-payment-portal";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs/server";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payment Portal | GND",
	});
}

export default async function ContractorsPaymentPortalPage({
	searchParams,
}: { searchParams: Promise<SearchParams> }) {
	const values = await searchParams;
	const context = readJobPaymentContext({
		get: (key) => (typeof values[key] === "string" ? values[key] : null),
	});
	const paymentPortalJobsInitialSettings = await getInitialTableSettings(
		"payment-portal-jobs",
	);

	await batchPrefetch([
		trpc.jobs.paymentDashboard.queryOptions({}),
		...(context.contractorId
			? [
					trpc.jobs.paymentPortal.queryOptions({
						userId: context.contractorId,
						status: context.status,
					}),
				]
			: []),
	]);

	return (
		<PageShell className="min-w-0 p-4 sm:p-6">
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Payment portal</PageTitle>
					<LazyPaymentPortal
						paymentPortalJobsInitialSettings={paymentPortalJobsInitialSettings}
					/>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
