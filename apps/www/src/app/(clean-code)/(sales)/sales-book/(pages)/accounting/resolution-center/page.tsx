import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { searchParamsCache } from "./search-params";
import { ErrorFallback } from "@/components/error-fallback";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/tables/skeleton";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { AuthGuard } from "@/components/auth-guard";
import { _role } from "@/components/sidebar/links";
import { ResolutionCenter } from "@/components/resolution-center";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Payment Resolution - gndprodesk.com`,
    });
}
export default async function HomePage({ searchParams }) {
    const searchQuery = searchParamsCache.parse(await searchParams);
    const { search } = searchQuery;

    const loadingKey = JSON.stringify({
        search,
    });
    return (
        <ErrorBoundary errorComponent={ErrorFallback}>
            <AuthGuard rules={[_role.is("Super Admin")]}>
                <FPage title="Resolution Center">
                    <Suspense fallback={<TableSkeleton />} key={loadingKey}>
                        <ResolutionCenter query={searchQuery} />
                    </Suspense>
                </FPage>
            </AuthGuard>
        </ErrorBoundary>
    );
}
