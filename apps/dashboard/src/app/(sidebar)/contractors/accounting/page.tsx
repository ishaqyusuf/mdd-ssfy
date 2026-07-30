import PageShell from "@/components/page-shell";
import { ContractorAccountingPage } from "@/components/contractor-accounting-page";
import { ContractorAccountingTitle } from "@/components/contractor-accounting/header";
import { ScrollableContent } from "@/components/scrollable-content";
import { HydrateClient } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Accounting | GND",
	});
}

export default async function ContractorAccountingRoute() {
	const initialSettings = await getInitialTableSettings("contractor-accounting");
	return (
		<PageShell className="pt-4">
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<ContractorAccountingTitle />
						<ContractorAccountingPage initialSettings={initialSettings} />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
