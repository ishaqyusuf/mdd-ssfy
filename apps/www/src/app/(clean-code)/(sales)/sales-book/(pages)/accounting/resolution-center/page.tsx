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
import { SalesResolutionHeader } from "@/components/sales-resolution-header";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Payment Resolution - gndprodesk.com`,
    });
}
export default async function Page({ searchParams }) {
    // loadResolutionCenterFilterParams(await searchParams);
    return (
        <AuthGuard rules={[_perm.is("viewSalesResolution")]}>
            <FPage title="Resolution Center">
                <div className="flex flex-col gap-6">
                    <SalesResolutionHeader />
                    <ErrorBoundary errorComponent={ErrorFallback}>
                        <Suspense fallback={<TableSkeleton />}>
                            <ResolutionCenter />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </FPage>
        </AuthGuard>
    );
}
