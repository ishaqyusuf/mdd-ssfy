import { CustomerServiceHeader } from "@/components/customer-service-header";
import { ErrorFallback } from "@/components/error-fallback";
import { LazyWorkOrderFilterChart } from "@/components/lazy-work-order-filter-chart";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/customer-service/data-table";
import { CustomerServiceSkeleton } from "@/components/tables-2/customer-service/skeleton";
import { WorkOrderSummaryWidgets } from "@/components/work-order-summary-widgets";
import { loadCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Customer Services | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadCustomerServiceFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("customer-service");
	const queryInput = {
		...filter,
		sort,
	} as RouterInputs["customerService"]["getCustomerServices"];

	batchPrefetch([
		trpc.customerService.getCustomerServices.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
		trpc.hrm.getEmployees.queryOptions({
			roles: ["Punchout"],
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Customer Service</PageTitle>
						<CustomerServiceHeader />
						<WorkOrderSummaryWidgets />
						<LazyWorkOrderFilterChart />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<CustomerServiceSkeleton initialSettings={initialSettings} />
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
