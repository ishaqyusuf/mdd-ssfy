import type { Metadata } from "next";

import { ProductionWorkerDashboardV2 } from "@/components/production-v2/shared";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
    title: "Production Dashboard v2",
    description:
        "Worker-first production dashboard with inline detail, note activity, and mobile-responsive expansion.",
};

export default function Page() {
    return (
        <PageShell>
            <ProductionWorkerDashboardV2 />
        </PageShell>
    );
}

