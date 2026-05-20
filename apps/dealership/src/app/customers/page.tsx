import { CustomersHeader } from "@/components/customers-header";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { DealershipShell } from "@/components/dealership-shell";
import { DataTable } from "@/components/tables/customers/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadCustomersFilterParams } from "@/hooks/use-customers-filter-params";
import { requireDealer } from "@/lib/dealer-session";
import {
	HydrateClient,
	batchPrefetch,
	getQueryClient,
	trpc,
} from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function CustomersPage(props: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const searchParams = await props.searchParams;
	const filter = loadCustomersFilterParams(searchParams);
	const { dealer } = await requireDealer();
	const queryClient = getQueryClient();
	const initialFilterList = await queryClient.fetchQuery(
		trpc.dealerPortal.customerFilters.queryOptions(),
	);

	batchPrefetch([trpc.dealerPortal.customersList.infiniteQueryOptions(filter)]);

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<HydrateClient>
					<PageTitle>Customers</PageTitle>
					<div className="flex flex-col gap-6">
						<CustomersHeader initialFilterList={initialFilterList} />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense fallback={<TableSkeleton />}>
								<DataTable />
							</Suspense>
						</ErrorBoundary>
					</div>
				</HydrateClient>
			</PageShell>
		</DealershipShell>
	);
}
