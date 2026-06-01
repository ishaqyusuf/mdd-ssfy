import PageShell from "@/components/page-shell";
import { NotificationChannelsV2Page } from "@/components/settings/notification-channels-v2-page";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Notification Channels | GND",
    });
}

export default async function Page() {
    const queryClient = getQueryClient();
    const channels = await queryClient.fetchQuery(
        trpc.notes.getNotificationChannels.queryOptions({
            q: null,
            size: 200,
        }),
    );
    const firstChannelId = channels.data[0]?.id;

    await Promise.all([
        queryClient.fetchQuery(trpc.hrm.getRoles.queryOptions()),
        queryClient.fetchQuery(
            trpc.hrm.getEmployees.queryOptions({
                size: 200,
            }),
        ),
        firstChannelId
            ? queryClient.fetchQuery(
                  trpc.notes.getNotificationChannel.queryOptions({
                      id: firstChannelId,
                  }),
              )
            : Promise.resolve(),
    ]);

    return (
        <PageShell className="h-[calc(100vh-var(--header-height))] overflow-hidden gap-6">
            <HydrateClient>
                <PageTitle>Notification Channels</PageTitle>
                <NotificationChannelsV2Page />
            </HydrateClient>
        </PageShell>
    );
}
