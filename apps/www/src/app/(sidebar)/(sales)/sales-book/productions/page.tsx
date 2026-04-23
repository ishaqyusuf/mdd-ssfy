import { ErrorFallback } from "@/components/error-fallback";
import {
	type DashboardResponse,
	ProductionWorkspace,
} from "@/components/production-workspace";
import { loadSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { PageFilterData } from "@api/type";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production - gndprodesk.com",
	});
}
export default async function Page(props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadSalesProductionFilterParams(searchParams);
	const [initialDashboardData, initialFilterList] = await Promise.all<
		[DashboardResponse, PageFilterData[]]
	>([
		queryClient.fetchQuery(trpc.sales.productionDashboard.queryOptions()),
		queryClient.fetchQuery(trpc.filters.salesProductions.queryOptions()),
	]);

	await queryClient.fetchInfiniteQuery(
		// biome-ignore lint/suspicious/noExplicitAny: shared tRPC infinite query options are not fully typed in this repo yet.
		trpc.sales.productions.infiniteQueryOptions(filter) as any,
	);

	return (
		<PageShell className="">
			<HydrateClient>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<ProductionWorkspace
						mode="admin"
						initialDashboardData={initialDashboardData}
						initialFilterList={initialFilterList}
					/>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
