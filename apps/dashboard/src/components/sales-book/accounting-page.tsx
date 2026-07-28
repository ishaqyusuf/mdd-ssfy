import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { SalesAccountingHeader } from "@/components/sales-accounting-header";
import { DataTable } from "@/components/tables-2/sales-accounting/data-table";
import { SalesAccountingSkeleton } from "@/components/tables-2/sales-accounting/skeleton";
import { loadSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

type SalesAccountingInput = RouterInputs["sales"]["getSalesAccountings"];

type Props = {
	searchParams: Promise<SearchParams>;
	title?: string;
};

export async function SalesBookAccountingPage({
	searchParams,
	title = "Sales Accounting",
}: Props) {
	const resolvedSearchParams = await searchParams;
	const filter = loadSalesAccountingFilterParams(
		resolvedSearchParams,
	) as SalesAccountingInput;
	const initialSettings = await getInitialTableSettings("sales-accounting");

	batchPrefetch([
		trpc.sales.getSalesAccountings.infiniteQueryOptions(filter, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 py-6">
					<PageTitle>{title}</PageTitle>
					<SalesAccountingHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<SalesAccountingSkeleton initialSettings={initialSettings} />
							}
						>
							<DataTable initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
