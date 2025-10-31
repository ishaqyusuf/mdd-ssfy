import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { __isProd } from "@/lib/is-prod-server";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { __getSalesOrderNos } from "@/actions/cache/sales-data-query";
import { SalesProductHeader } from "@/components/sales-production-header";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { Suspense } from "react";
import { DataTable } from "@/components/tables/sales-production/data-table";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales Production - gndprodesk.com`,
    });
}
export default async function Page(props) {
    return (
        <FPage can={["viewOrders"]} className="" title="Productions">
            <div className="flex flex-col gap-6">
                <SalesProductHeader />
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <DataTable />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </FPage>
    );
}

