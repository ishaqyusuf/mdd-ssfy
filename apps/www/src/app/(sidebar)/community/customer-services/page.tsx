import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/customer-service/data-table";
import { CustomerServiceHeader } from "@/components/customer-service-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { WorkOrderSummaryWidgets } from "@/components/work-order-summary-widgets";
import { WorkOrderFilterChart } from "@/components/work-order-filter-chart";

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
    );
}

