import { WorkerOverview } from "@/components/jobs-dashboard/worker-overview";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Job Dashboard | GND",
	});
}

export default function JobsDashboardPage() {
	return (
		<PageShell>
			{" "}
			<WorkerOverview />
		</PageShell>
	);
}
