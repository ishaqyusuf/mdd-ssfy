import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { AppDownloadSupportPage } from "@/components/settings/app-download-support-page";
import { PageTitle } from "@gnd/ui/custom/page-title";

export default function Page() {
	return (
		<PageShell>
			<ScrollableContent>
				<div className="flex flex-col gap-6">
					<PageTitle>Mobile App Access</PageTitle>
					<AppDownloadSupportPage />
				</div>
			</ScrollableContent>
		</PageShell>
	);
}
