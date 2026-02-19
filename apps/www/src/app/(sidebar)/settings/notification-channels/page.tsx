import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import { batchPrefetch, trpc } from "@/trpc/server";

import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { loadNotificationChannelFilterParams } from "@/hooks/use-notification-channel-filter-params";
import { NotificationChannelForm } from "@/components/forms/notification-channel-form";
import NotificationChannels from "@/components/tables/notification-channels";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Notification Channels | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;
    const filter = loadNotificationChannelFilterParams(searchParams);
    batchPrefetch([
        trpc.notes.getNotificationChannels.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <ErrorBoundary errorComponent={ErrorFallback}>
            <Suspense fallback={<TableSkeleton />}>
                <div className="flex -px-6 overflow-hidden h-[calc(100vh - var(--header-height))]">
                    <PageTitle>Notification Channels</PageTitle>
                    <NotificationChannels />
                    <NotificationChannelForm />
                </div>
            </Suspense>
        </ErrorBoundary>
    );
    // return (
    //     <div className="flex flex-col gap-6 pt-6">
    //         <PageTitle>Notification Channels</PageTitle>
    //         <NotificationChannelHeader />
    //         <ErrorBoundary errorComponent={ErrorFallback}>
    //             <Suspense fallback={<TableSkeleton />}>
    //                 <DataTable />
    //             </Suspense>
    //         </ErrorBoundary>
    //     </div>
    // );
}

