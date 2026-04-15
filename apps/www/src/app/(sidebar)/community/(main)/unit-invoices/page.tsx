import { ErrorFallback } from "@/components/error-fallback";
import { UnitInvoiceModal } from "@/components/modals/unit-invoice-modal";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/unit-invoices/data-table";
import { UnitInvoicesHeader } from "@/components/unit-invoices-header";
import { loadSortParams } from "@/hooks/use-sort-params";
import { loadUnitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Unit Invoices | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadUnitInvoiceFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);

	await queryClient.fetchInfiniteQuery(
		trpc.community.getUnitInvoices.infiniteQueryOptions({
			...(filter as any),
			sort,
		}) as any,
	);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<PageTitle>Unit Invoices</PageTitle>
					<UnitInvoicesHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<DataTable />
						</Suspense>
					</ErrorBoundary>
					<UnitInvoiceModal />
				</div>
			</HydrateClient>
		</PageShell>
	);
}
