import { CustomerOverviewPageClient } from "@/components/customer-overview/customer-overview-page-client";
import { DealershipShell } from "@/components/dealership-shell";
import PageShell from "@/components/page-shell";
import {
	resolveCustomerOverviewTab,
} from "@/lib/customer-overview-tabs";
import { requireDealer } from "@/lib/dealer-session";
import {
	HydrateClient,
	batchPrefetch,
	getQueryClient,
	trpc,
} from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerOverviewPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const [{ id }, rawSearchParams] = await Promise.all([params, searchParams]);
	const customerId = Number(id);
	if (!Number.isFinite(customerId)) notFound();

	const initialTab = resolveCustomerOverviewTab(
		typeof rawSearchParams.customerOverviewTab === "string"
			? rawSearchParams.customerOverviewTab
			: null,
	);
	const { dealer } = await requireDealer();
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(
		trpc.dealerPortal.customerOverview.queryOptions({ id: customerId }),
	);
	if (initialTab === "orders") {
		batchPrefetch([
			trpc.dealerPortal.orders.infiniteQueryOptions({
				customerId,
			}),
		]);
	}

	if (initialTab === "quotes") {
		batchPrefetch([
			trpc.dealerPortal.quotes.infiniteQueryOptions({
				customerId,
			}),
		]);
	}

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<HydrateClient>
					<PageTitle>Customer Overview</PageTitle>
					<CustomerOverviewPageClient
						customerId={customerId}
						initialTab={initialTab}
					/>
				</HydrateClient>
			</PageShell>
		</DealershipShell>
	);
}
