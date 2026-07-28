import { PaymentsHistoryView } from "@/components/payment-dashboard/payments-history-view";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadContractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

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
	const filter = loadContractorPayoutFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("contractor-payouts");
	const queryInput = {
		...filter,
		sort,
	} as RouterInputs["jobs"]["contractorPayouts"];

	batchPrefetch([
		trpc.filters.contractorPayout.queryOptions(),
		trpc.jobs.contractorPayouts.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="pt-2">
						<PaymentsHistoryView initialSettings={initialSettings} />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
