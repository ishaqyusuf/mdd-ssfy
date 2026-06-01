import { LazyWorkerOverview } from "@/components/jobs-dashboard/lazy-worker-dashboard";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Job Dashboard | GND",
    });
}

export default function JobsDashboardPage() {
    return (
        <PageShell>
            <LazyWorkerOverview />
        </PageShell>
    );
}
