import { PaymentsHistoryView } from "@/components/payment-dashboard/payments-history-view";
import { loadContractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";

import PageShell from "@/components/page-shell";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payments | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function ContractorsPaymentsPage(props: Props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadContractorPayoutFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);

	const [initialFilterList, _initialPayouts, _dashboard] = await Promise.all([
		queryClient.fetchQuery(trpc.filters.contractorPayout.queryOptions()),
		queryClient.fetchInfiniteQuery(
			trpc.jobs.contractorPayouts.infiniteQueryOptions({
				...filter,
				sort,
			}) as any,
		),
		queryClient.fetchQuery(trpc.jobs.paymentDashboard.queryOptions({})),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<div className="pt-2">
					<PaymentsHistoryView initialFilterList={initialFilterList as any} />
				</div>
			</HydrateClient>
		</PageShell>
	);
}
