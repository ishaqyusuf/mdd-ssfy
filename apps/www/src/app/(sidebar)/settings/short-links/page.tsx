import PageShell from "@/components/page-shell";
import { ShortLinksSettingsPage } from "@/components/settings/short-links-settings-page";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Short Links | GND",
	});
}

export default function Page() {
	return (
		<PageShell className="gap-6">
			<PageTitle>Short Links</PageTitle>
			<ShortLinksSettingsPage />
		</PageShell>
	);
}
