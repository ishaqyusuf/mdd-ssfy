import { ErrorFallback } from "@/components/error-fallback";
import { ProductionWorkspace } from "@/components/production-workspace";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { unstable_noStore } from "next/cache";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
    return constructMetadata({
        title: "Sales Production - gndprodesk.com",
    });
}
export default async function SalesBookPage() {
    unstable_noStore();
    return (
        <PageShell>
            <ErrorBoundary errorComponent={ErrorFallback}>
                <ProductionWorkspace mode="worker" />
            </ErrorBoundary>
        </PageShell>
    );
}
