import {
	getDriverManifestInput,
	getDriverNextCursor,
} from "@/components/driver-dashboard/model";
import { DriverDashboardSkeleton } from "@/components/driver-dashboard/skeleton";
import { DriverDashboardWorkspace } from "@/components/driver-dashboard/workspace";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { loadDriverDashboardParams } from "@/hooks/use-driver-dashboard-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { getServerAuthSession } from "@/lib/auth/session";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Dispatch Tasks | GND",
	});
}

type Props = { searchParams: Promise<SearchParams> };

export default async function DriverDashboardPage({ searchParams }: Props) {
	const [session, resolvedSearchParams] = await Promise.all([
		getServerAuthSession(),
		searchParams,
	]);
	const params = loadDriverDashboardParams(resolvedSearchParams);
	const initialNow = Date.now();
	const input = getDriverManifestInput({
		view: params.view,
		search: params.q,
	});
	const summaryInput = getDriverManifestInput({
		view: "all",
		search: params.q,
	});
	const readyInput = getDriverManifestInput({
		view: "packed",
		search: params.q,
	});
	const todaySummaryInput = getDriverManifestInput({
		view: "today",
		search: params.q,
	});

	batchPrefetch([
		trpc.dispatch.driverManifest.infiniteQueryOptions(input, {
			getNextPageParam: getDriverNextCursor,
		}),
		trpc.dispatch.driverWorkQueueSummary.queryOptions(summaryInput),
		trpc.dispatch.driverWorkQueueSummary.queryOptions(todaySummaryInput),
		trpc.dispatch.driverWorkQueue.queryOptions(readyInput),
	]);

	return (
		<PageShell className="p-4 pb-4 sm:p-6 sm:pb-4">
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Dispatch Tasks</PageTitle>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<DriverDashboardSkeleton />}>
							<DriverDashboardWorkspace
								driverName={session?.user?.name}
								initialNow={initialNow}
							/>
						</Suspense>
					</ErrorBoundary>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
