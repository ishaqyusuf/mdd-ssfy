import { ErrorFallback } from "@/components/error-fallback";
import { PrintContractorPayouts } from "@/components/print-contractor-payouts";
import { PrintLoading } from "@/components/print-loading";
import { loadContractorPayoutPrintFilterParams } from "@/hooks/use-contractor-payout-print-filter";
import { batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata() {
    return constructMetadata({
        title: "Contractor Payout Print | GND",
    });
}

export default async function Page(props) {
    const searchParams = await props.searchParams;
    const filter = loadContractorPayoutPrintFilterParams(searchParams);

    batchPrefetch([
        trpc.print.contractorPayouts.queryOptions({
            token: filter.token ?? "",
            preview: filter.preview ?? false,
        }),
    ]);

    return (
        <>
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<PrintLoading />}>
                    <PrintContractorPayouts />
                </Suspense>
            </ErrorBoundary>
        </>
    );
}

