import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { TaskRunDiagnosticsSkeleton } from "@/components/tables-2/task-run-diagnostics/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { TaskRunDiagnosticsDashboard } from "../_components/task-run-diagnostics-dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
	const initialSettings = await getInitialTableSettings("task-run-diagnostics");

	batchPrefetch([
		trpc.taskRunDiagnostics.list.queryOptions({
			size: 50,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Task Diagnostics</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<TaskRunDiagnosticsSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<TaskRunDiagnosticsDashboard
									initialSettings={initialSettings}
								/>
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
