import { _trpc } from "@/components/static-trpc";
import type { QueryClient } from "@tanstack/react-query";

export async function invalidateDispatchQueries(queryClient: QueryClient) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.dispatchOverviewV2.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.manifest.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.detail.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.assignedDispatch.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.driverManifest.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.driverWorkQueue.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.driverWorkQueueSummary.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.packingList.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.packingListSummary.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.dispatch.exceptions.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: _trpc.packingReports.context.queryKey(),
		}),
		queryClient.invalidateQueries({ queryKey: _trpc.notes.list.queryKey() }),
	]);
}
