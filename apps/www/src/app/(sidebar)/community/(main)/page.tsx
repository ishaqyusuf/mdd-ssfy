import { CommunityDashboard } from "@/components/community-dashboard";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { unstable_noStore } from "next/cache";

import PageShell from "@/components/page-shell";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Community Dashboard | GND",
	});
}

export default async function Page() {
	unstable_noStore();
	batchPrefetch([trpc.community.communityDashboardOverview.queryOptions({})]);

	return (
		<PageShell>
			<div className="flex flex-col gap-6 px-4 sm:px-6">
				<PageTitle>Community Dashboard</PageTitle>
				<HydrateClient>
					<CommunityDashboard />
				</HydrateClient>
			</div>
		</PageShell>
	);
}
