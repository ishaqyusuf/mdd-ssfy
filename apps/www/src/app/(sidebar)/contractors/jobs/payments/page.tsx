import { ContractorPayoutsHeader } from "@/components/contractor-payouts-header";
import { ErrorFallback } from "@/components/error-fallback";
import { ContractorPayoutOverviewModal } from "@/components/modals/contractor-payout-overview-modal";
import { DataTable } from "@/components/tables/contractor-payouts/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadContractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

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
	const filter = loadContractorPayoutFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);

	batchPrefetch([
		trpc.jobs.contractorPayouts.infiniteQueryOptions({
			...(filter as any),
			sort,
		}),
	]);

	return (
		<PageShell>
			<div className="flex flex-col gap-6 pt-6">
				<PageTitle>Contractor Payments</PageTitle>
				<ContractorPayoutsHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
				<ContractorPayoutOverviewModal />
			</div>
		</PageShell>
	);
}
