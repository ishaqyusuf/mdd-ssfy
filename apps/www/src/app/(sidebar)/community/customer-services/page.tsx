import { CustomerServiceHeader } from "@/components/customer-service-header";
import { ErrorFallback } from "@/components/error-fallback";
import { LazyWorkOrderFilterChart } from "@/components/lazy-work-order-filter-chart";
import { DataTable } from "@/components/tables-2/customer-service/data-table";
import { CustomerServiceSkeleton } from "@/components/tables-2/customer-service/skeleton";
import { WorkOrderSummaryWidgets } from "@/components/work-order-summary-widgets";
import { loadCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
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
	const queryClient = getQueryClient();
	const filter = loadCustomerServiceFilterParams(searchParams);
	const [initialSettings] = await Promise.all([
		getInitialTableSettings("customer-service"),
		queryClient.fetchInfiniteQuery(
			trpc.customerService.getCustomerServices.infiniteQueryOptions({
				...filter,
			}),
		),
		queryClient.fetchQuery(
			trpc.hrm.getEmployees.queryOptions({
				roles: ["Punchout"],
			}),
		),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6 px-6">
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
			</HydrateClient>
		</PageShell>
	);
}
