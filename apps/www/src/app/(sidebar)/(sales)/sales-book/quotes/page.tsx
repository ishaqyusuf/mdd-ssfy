import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { OrderHeader } from "@/components/sales-order-header";
import { DataTable } from "@/components/tables/sales-quotes/data-table";
import { SalesQuoteHeader } from "@/components/sales-quote-header";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Quotes | GND",
    });
}

export default async function Page() {
    return (
        <FPage can={["viewEstimates"]} title="Quotes">
            <div className="flex flex-col gap-6">
                <SalesQuoteHeader />
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<TableSkeleton />}>
                        <DataTable />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </FPage>
    );
}

