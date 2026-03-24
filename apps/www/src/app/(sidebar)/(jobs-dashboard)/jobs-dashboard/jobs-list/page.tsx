import { WorkerJobsList } from "@/components/jobs-dashboard/worker-jobs-list";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Jobs List | GND",
	});
}

export default function JobsDashboardJobsListPage() {
	return <WorkerJobsList />;
}
