import { WorkerPaymentsOverview } from "@/components/jobs-dashboard/worker-payments-overview";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Job Payments | GND",
	});
}

export default async function JobsDashboardPaymentsPage() {
	const queryClient = getQueryClient();
	await Promise.all([
		queryClient.fetchQuery(trpc.jobs.getJobAnalytics.queryOptions({})),
		queryClient.fetchQuery(trpc.jobs.earningAnalytics.queryOptions({})),
	]);

	return (
		<PageShell>
			<HydrateClient>
				{" "}
				<WorkerPaymentsOverview />
			</HydrateClient>
		</PageShell>
	);
}
