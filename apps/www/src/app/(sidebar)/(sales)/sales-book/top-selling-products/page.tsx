import { ErrorFallback } from "@/components/error-fallback";
import { ProductReportHeader } from "@/components/product-report-header";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/sales-statistics/data-table";
import { SalesStatisticsSkeleton } from "@/components/tables-2/sales-statistics/skeleton";
import { loadProductReportFilterParams } from "@/hooks/use-product-report-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

type ProductReportInput = RouterInputs["sales"]["getProductReport"];

export async function generateMetadata() {
	return constructMetadata({
		title: "Top Selling Products | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadProductReportFilterParams(searchParams);
	const initialSettings = await getInitialTableSettings("sales-statistics");
	const queryInput = {
		...filter,
	} as ProductReportInput;

	batchPrefetch([
		trpc.sales.getProductReport.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Top Selling Products</PageTitle>
						<ProductReportHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<SalesStatisticsSkeleton initialSettings={initialSettings} />
								}
							>
								<DataTable initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
