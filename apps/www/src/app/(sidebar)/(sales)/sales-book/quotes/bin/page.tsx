import { ErrorFallback } from "@/components/error-fallback";
import { OrderHeader } from "@/components/sales-order-header";
import { SalesQuoteHeader } from "@/components/sales-quote-header";
import { DataTable } from "@/components/tables/sales-quotes/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { resolveSalesVisibility } from "@/lib/sales-visibility";
import { batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Quotes Bin | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	const { filter } = await resolveSalesVisibility(
		loadOrderFilterParams(searchParams),
	);
	batchPrefetch([
		trpc.sales.quotes.infiniteQueryOptions({
			...(filter as any),
			bin: true,
		}),
	]);
	return (
		<PageShell>
			<PageTitle>Quotes Bin</PageTitle>
			<div className="flex flex-col gap-6">
				<SalesQuoteHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<DataTable bin />
					</Suspense>
				</ErrorBoundary>
			</div>
		</PageShell>
	);
}
