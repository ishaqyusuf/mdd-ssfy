import CommunityInstallCostRate from "@/components/community-install-costs";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import PageShell from "@/components/page-shell";
export function generateMetadata() {
	return constructMetadata({
		title: "Install Costs | GND",
	});
}

export default async function Page() {
	return (
		<PageShell>
			<>
				<CommunityInstallCostRate />
			</>
		</PageShell>
	);
}
