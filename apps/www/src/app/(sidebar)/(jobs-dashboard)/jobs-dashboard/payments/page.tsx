import { WorkerPaymentsOverview } from "@/components/jobs-dashboard/worker-payments-overview";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Job Payments | GND",
	});
}

export default function JobsDashboardPaymentsPage() {
	return (
		<PageShell>
			{" "}
			<WorkerPaymentsOverview />
		</PageShell>
	);
}
