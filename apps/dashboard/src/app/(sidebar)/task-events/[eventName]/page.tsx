import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { TaskEventHistorySkeleton } from "@/components/tables-2/task-event-history/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { TaskEventDetail } from "../_components/task-event-detail";

export const dynamic = "force-dynamic";

type Props = {
	params: Promise<{
		eventName: string;
	}>;
};

export default async function Page(props: Props) {
	const params = await props.params;
	const initialSettings = await getInitialTableSettings("task-event-history");

	batchPrefetch([
		trpc.taskEvents.get.queryOptions({
			eventName: params.eventName,
		}),
		trpc.taskEvents.history.queryOptions({
			eventName: params.eventName,
		}),
		trpc.taskEvents.list.queryOptions(),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4 pt-6">
						<PageTitle>Task Event</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<TaskEventHistorySkeleton initialSettings={initialSettings} />
								}
							>
								<TaskEventDetail
									eventName={params.eventName}
									initialHistorySettings={initialSettings}
								/>
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
