import CommunityInstallCostRate from "@/components/community-install-costs";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export function generateMetadata() {
	return constructMetadata({
		title: "Install Costs | GND",
	});
}

export default async function Page() {
	const queryClient = getQueryClient();

	await queryClient.fetchQuery(
		trpc.community.getCommunityInstallCostRates.queryOptions(undefined),
	);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Install Costs</PageTitle>
				<CommunityInstallCostRate />
			</HydrateClient>
		</PageShell>
	);
}
