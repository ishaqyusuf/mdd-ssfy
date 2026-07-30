import PageShell from "@/components/page-shell";
import { SalesFinanceTitle } from "@/components/sales-finance/header";
import { SalesFinanceWorkspaceClient } from "@/components/sales-finance/workspace-client";
import { ScrollableContent } from "@/components/scrollable-content";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Finance | GND",
	});
}

export default async function SalesFinancePage() {
	const [
		initialSettings,
		receivablesInitialSettings,
		resolutionInitialSettings,
	] = await Promise.all([
		getInitialTableSettings("sales-finance"),
		getInitialTableSettings("sales-finance-receivables"),
		getInitialTableSettings("sales-resolution"),
	]);

	return (
		<PageShell className="pt-4">
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<SalesFinanceTitle />
						<SalesFinanceWorkspaceClient
							initialSettings={initialSettings}
							receivablesInitialSettings={receivablesInitialSettings}
							resolutionInitialSettings={resolutionInitialSettings}
						/>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
