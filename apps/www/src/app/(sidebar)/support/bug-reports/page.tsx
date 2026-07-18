import { BugReportWorkspace } from "@/components/bug-reports/bug-report-workspace";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Bug Reports | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings("bug-reports");

	return (
		<PageShell className="h-[calc(100vh-var(--header-height))] overflow-hidden">
			<PageTitle>Bug Reports</PageTitle>
			<ScrollableContent>
				<BugReportWorkspace initialSettings={initialSettings} />
			</ScrollableContent>
		</PageShell>
	);
}
