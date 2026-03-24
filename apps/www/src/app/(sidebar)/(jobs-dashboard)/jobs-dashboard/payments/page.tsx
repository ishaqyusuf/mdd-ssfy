import { WorkerPaymentsOverview } from "@/components/jobs-dashboard/worker-payments-overview";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Job Payments | GND",
	});
}

export default function JobsDashboardPaymentsPage() {
	return <WorkerPaymentsOverview />;
}
