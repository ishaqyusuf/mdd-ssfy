import { CustomerServiceHeader } from "@/components/customer-service-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/customer-service/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { WorkOrderFilterChart } from "@/components/work-order-filter-chart";
import { WorkOrderSummaryWidgets } from "@/components/work-order-summary-widgets";
import { loadCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
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
	batchPrefetch([
		trpc.customerService.getCustomerServices.infiniteQueryOptions({
			...filter,
		}),
		trpc.workOrder.getWorkOrderAnalytic.queryOptions({ type: "total" }),
		trpc.workOrder.getWorkOrderAnalytic.queryOptions({ type: "pending" }),
		trpc.workOrder.getWorkOrderAnalytic.queryOptions({ type: "completed" }),
		trpc.workOrder.getWorkOrderAnalytic.queryOptions({ type: "avg" }),
	]);
	return (
		<PageShell>
			<div className="flex flex-col gap-6 pt-6 px-6">
				<PageTitle>Customer Service</PageTitle>
				<CustomerServiceHeader />
				<WorkOrderSummaryWidgets />
				<WorkOrderFilterChart />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
			</div>
		</PageShell>
	);
}
