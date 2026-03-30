import type { Metadata } from "next";

import { ProductionWorkerDashboardV2 } from "@/components/production-v2/shared";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export const metadata: Metadata = {
    title: "Production Dashboard v2",
    description:
        "Worker-first production dashboard with inline detail, note activity, and mobile-responsive expansion.",
};

export default function Page() {
    return (
        <PageShell>
            <PageTitle>Production</PageTitle>
            <ProductionWorkerDashboardV2 />
        </PageShell>
    );
}

