import { ProductionWorkspace } from "@/components/production-workspace";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PageShell from "@/components/page-shell";
import { ProductionWorkerDashboardV2 } from "@/components/production-v2/shared";
export const metadata: Metadata = {
    title: "Production Worker Dashboard",
    description:
        "Track due work, tomorrow alerts, and your active production queue",
};

export default function Page() {
    // redirect("/production/dashboard/v2"); // Temporary redirect to the new production page while we transition
    return (
        <PageShell>
            <div className="relative">
                <ProductionWorkspace mode="worker" />
            </div>
        </PageShell>
    );
}

