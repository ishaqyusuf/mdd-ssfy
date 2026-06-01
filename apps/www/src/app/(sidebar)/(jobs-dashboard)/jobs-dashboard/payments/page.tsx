import { LazyWorkerPaymentsOverview } from "@/components/jobs-dashboard/lazy-worker-dashboard";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Job Payments | GND",
    });
}

export default function JobsDashboardPaymentsPage() {
    return (
        <PageShell>
            <LazyWorkerPaymentsOverview />
        </PageShell>
    );
}
