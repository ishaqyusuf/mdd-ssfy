import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { __isProd } from "@/lib/is-prod-server";
import { __getSalesOrderNos } from "@/actions/cache/sales-data-query";
import { SalesProductHeader } from "@/components/sales-production-header";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/sales-production/data-table";
import { Suspense } from "react";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales Production - gndprodesk.com`,
    });
}
export default async function SalesBookPage(props) {
    return (
        <FPage title="Productions" can={["viewProduction"]}>
            <div className="flex flex-col gap-6">
                <SalesProductHeader workerMode />
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <DataTable workerMode />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </FPage>
    );
}

