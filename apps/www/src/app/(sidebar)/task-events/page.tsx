import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { TaskEventsSkeleton } from "@/components/tables-2/task-events/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { TaskEventsDashboard } from "./_components/task-events-dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
	const initialSettings = await getInitialTableSettings("task-events");

	batchPrefetch([trpc.taskEvents.list.queryOptions()]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4 pt-6">
						<PageTitle>Task Events</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<TaskEventsSkeleton initialSettings={initialSettings} />
								}
							>
								<TaskEventsDashboard initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
