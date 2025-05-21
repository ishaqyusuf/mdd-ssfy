import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { searchParamsCache } from "./search-params";
import { ErrorFallback } from "@/components/error-fallback";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/tables/skeleton";
import { EmployeesTable } from "@/components/tables/employees";

export default async function HomePage({ searchParams }) {
    const searchQuery = searchParamsCache.parse(await searchParams);
    const { search } = searchQuery;

    const loadingKey = JSON.stringify({
        search,
    });
    return (
        <div>
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />} key={loadingKey}>
                    <EmployeesTable query={searchQuery} />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
