import { ErrorFallback } from "@/components/error-fallback";
import { ProductionWorkspace } from "@/components/production-workspace";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
    return constructMetadata({
        title: "Sales Production - gndprodesk.com",
    });
}
export default async function SalesBookPage() {
    return (
        <PageShell>
            <ErrorBoundary errorComponent={ErrorFallback}>
                <ProductionWorkspace mode="worker" />
            </ErrorBoundary>
        </PageShell>
    );
}

