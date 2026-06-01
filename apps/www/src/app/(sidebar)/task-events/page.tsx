import { ErrorFallback } from "@/components/error-fallback";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { TaskEventsDashboard } from "./_components/task-events-dashboard";

import PageShell from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default async function Page() {
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(trpc.taskEvents.list.queryOptions());

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Task Events</PageTitle>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<div>Loading task events...</div>}>
							<TaskEventsDashboard />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
