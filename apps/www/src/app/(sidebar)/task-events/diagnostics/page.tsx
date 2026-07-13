import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { TaskRunDiagnosticsDashboard } from "../_components/task-run-diagnostics-dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(
		trpc.taskRunDiagnostics.list.queryOptions({
			size: 50,
		}),
	);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Task Diagnostics</PageTitle>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<div>Loading task diagnostics...</div>}>
							<TaskRunDiagnosticsDashboard />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
