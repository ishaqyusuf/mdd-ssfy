import PageShell from "@/components/page-shell";
import { NotificationChannelsV2Page } from "@/components/settings/notification-channels-v2-page";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Notification Channels | GND",
	});
}

export default function Page() {
	return (
		<PageShell className="h-[calc(100vh-var(--header-height))] overflow-hidden gap-6">
			<PageTitle>Notification Channels</PageTitle>
			<NotificationChannelsV2Page />
		</PageShell>
	);
}
