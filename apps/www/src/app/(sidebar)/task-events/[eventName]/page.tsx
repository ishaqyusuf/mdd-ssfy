import { ErrorFallback } from "@/components/error-fallback";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { TaskEventDetail } from "../_components/task-event-detail";

import PageShell from "@/components/page-shell";

export const dynamic = "force-dynamic";

type Props = {
	params: Promise<{
		eventName: string;
	}>;
};

export default async function Page(props: Props) {
	const params = await props.params;
	const queryClient = getQueryClient();
	const eventPromise = queryClient.fetchQuery(
		trpc.taskEvents.get.queryOptions({
			eventName: params.eventName,
		}),
	);
	const listPromise = queryClient.fetchQuery(trpc.taskEvents.list.queryOptions());
	const event = await eventPromise;

	await Promise.all([
		queryClient.fetchQuery(
			trpc.taskEvents.history.queryOptions({
				eventName: params.eventName,
			}),
		),
		listPromise,
		event?.filterSystem?.systemId === "sales-order-search-filter"
			? queryClient.fetchQuery(
					trpc.filters.salesOrders.queryOptions({
						salesManager: true,
					}),
				)
			: Promise.resolve(),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Task Event</PageTitle>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<div>Loading event...</div>}>
							<TaskEventDetail eventName={params.eventName} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
