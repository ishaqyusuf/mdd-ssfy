import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { DriverStopSkeleton } from "./driver-stop-skeleton";
import { DriverStopWorkspace } from "./driver-stop-workspace";

export async function DriverStopRoute({
	dispatchId,
	modal = false,
}: {
	dispatchId: number;
	modal?: boolean;
}) {
	batchPrefetch([
		trpc.dispatch.manifest.queryOptions({ dispatchId }),
		trpc.dispatch.dispatchOverviewV2.queryOptions({ dispatchId }),
	]);

	return (
		<HydrateClient>
			<Suspense fallback={<DriverStopSkeleton showWorkspaceHeader={modal} />}>
				<DriverStopWorkspace dispatchId={dispatchId} modal={modal} />
			</Suspense>
		</HydrateClient>
	);
}
