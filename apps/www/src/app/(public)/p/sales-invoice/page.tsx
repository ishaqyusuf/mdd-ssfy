import { ErrorFallback } from "@/components/error-fallback";
import { PrintLoading } from "@/components/print-loading";
import { PrintSales } from "@/components/print-sales";

import { loadSalesPrintFilterParams } from "@/hooks/use-sales-print-filter";
import { batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Model Template Preview | GND",
    });
}
export default async function Page(props) {
    const searchParams = await props.searchParams;
    const filter = loadSalesPrintFilterParams(searchParams);
    batchPrefetch([
        trpc.print.sales.queryOptions({
            ...(filter as any),
        }),
    ]);

    return (
        <>
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<PrintLoading />}>
                    <PrintSales />
                </Suspense>
            </ErrorBoundary>
        </>
    );
}

