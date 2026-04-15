import { WorkerOverview } from "@/components/jobs-dashboard/worker-overview";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Job Dashboard | GND",
	});
}

export default async function JobsDashboardPage() {
	const queryClient = getQueryClient();
	await Promise.all([
		queryClient.fetchQuery(trpc.user.getProfile.queryOptions()),
		queryClient.fetchQuery(trpc.jobs.getJobAnalytics.queryOptions({})),
		queryClient.fetchQuery(trpc.jobs.earningAnalytics.queryOptions({})),
	]);

	return (
		<PageShell>
			<HydrateClient>
				{" "}
				<WorkerOverview />
			</HydrateClient>
		</PageShell>
	);
}
