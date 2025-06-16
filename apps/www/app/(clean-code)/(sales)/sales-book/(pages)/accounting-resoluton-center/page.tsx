import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { searchParamsCache } from "./search-params";
import { ErrorFallback } from "@/components/error-fallback";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/tables/skeleton";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { AuthGuard } from "@/components/auth-guard";
import { _role } from "@/components/sidebar/links";
import { SalesAccountingConflictsTable } from "@/components/tables/sales-accounting-conflicts";

export default async function HomePage({ searchParams }) {
    const searchQuery = searchParamsCache.parse(await searchParams);
    const { search } = searchQuery;

    const loadingKey = JSON.stringify({
        search,
    });
    return (
        <ErrorBoundary errorComponent={ErrorFallback}>
            <AuthGuard rules={[_role.is("Super Admin")]}>
                <FPage title="Accounting Conflict Resolution">
                    <Suspense fallback={<TableSkeleton />} key={loadingKey}>
                        <SalesAccountingConflictsTable query={searchQuery} />
                    </Suspense>
                </FPage>
            </AuthGuard>
        </ErrorBoundary>
    );
}
