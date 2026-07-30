import PageShell from "@/components/page-shell";
import { SalesReportsWorkspace } from "@/components/sales-reports/workspace";
import { HydrateClient } from "@/trpc/server";
import { getInitialSalesReportLayout } from "@/utils/sales-report-settings";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export default async function SalesReportsPage() {
	const initialLayout = await getInitialSalesReportLayout();

	return (
		<PageShell className="p-3 sm:p-4 md:p-6 lg:p-8">
			<HydrateClient>
				<PageTitle>Sales Reports</PageTitle>
				<SalesReportsWorkspace initialLayout={initialLayout} />
			</HydrateClient>
		</PageShell>
	);
}
