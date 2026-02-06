import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { AuthGuard } from "@/components/auth-guard";
import { ErrorFallback } from "@/components/error-fallback";
import { _role } from "@/components/sidebar/links";
import { DataTable } from "@/components/tables/site-actions/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadingSiteActionFilterParams } from "@/hooks/use-site-action-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "Site Actions | GND",
};

type Props = {
    searchParams;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadingSiteActionFilterParams(searchParams);
    batchPrefetch([
        trpc.siteActions.index.infiniteQueryOptions({
            ...(filter as any),
        }),
    ]);
    return (
        <AuthGuard rules={[_role.is("Super Admin")]}>
            <FPage title="Site Actions">
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <DataTable />
                    </Suspense>
                </ErrorBoundary>
            </FPage>
        </AuthGuard>
    );
}

