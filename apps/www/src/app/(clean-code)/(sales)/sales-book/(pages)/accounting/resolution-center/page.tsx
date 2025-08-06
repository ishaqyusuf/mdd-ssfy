import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { searchParamsCache } from "./search-params";
import { ErrorFallback } from "@/components/error-fallback";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/tables/skeleton";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { AuthGuard } from "@/components/auth-guard";
import { _perm, _role } from "@/components/sidebar/links";
import { ResolutionCenter } from "@/components/resolution-center";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { loadResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Payment Resolution - gndprodesk.com`,
    });
}
export default async function Page({ searchParams }) {
    // loadResolutionCenterFilterParams(await searchParams);
    return (
        <ErrorBoundary errorComponent={ErrorFallback}>
            <AuthGuard rules={[_perm.is("viewSalesResolution")]}>
                <FPage title="Resolution Center">
                    <Suspense fallback={<TableSkeleton />}>
                        <ResolutionCenter />
                    </Suspense>
                </FPage>
            </AuthGuard>
        </ErrorBoundary>
    );
}
