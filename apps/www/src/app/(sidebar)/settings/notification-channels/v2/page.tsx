import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { NotificationChannelsV2Page } from "@/components/settings/notification-channels-v2-page";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Notification Channels | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings(
		"notification-channels",
	);

	batchPrefetch([
		trpc.notes.getNotificationChannels.queryOptions({
			q: null,
			size: 200,
		}),
		trpc.hrm.getRoles.queryOptions(),
		trpc.hrm.getEmployees.queryOptions({
			size: 200,
		}),
	]);

	return (
		<PageShell className="h-[calc(100vh-var(--header-height))] overflow-hidden">
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Notification Channels</PageTitle>
						<NotificationChannelsV2Page initialSettings={initialSettings} />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
