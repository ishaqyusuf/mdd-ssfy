import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { BugReportAccessSettingsPage } from "@/components/settings/bug-report-access-settings-page";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Bug Report Access | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings(
		"bug-report-access-employees",
	);

	return (
		<PageShell className="h-[calc(100vh-var(--header-height))] overflow-hidden">
			<ScrollableContent>
				<div className="flex flex-col gap-4">
					<PageTitle>Bug Report Access</PageTitle>
					<BugReportAccessSettingsPage initialSettings={initialSettings} />
				</div>
			</ScrollableContent>
		</PageShell>
	);
}
