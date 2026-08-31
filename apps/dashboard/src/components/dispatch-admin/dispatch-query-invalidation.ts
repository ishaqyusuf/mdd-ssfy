import type { useTRPC } from "@/trpc/client";
import type { QueryClient } from "@tanstack/react-query";

export function invalidateDispatchWorkspace(
	queryClient: QueryClient,
	trpc: ReturnType<typeof useTRPC>,
) {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: trpc.dispatch.list.pathKey() }),
		queryClient.invalidateQueries({ queryKey: trpc.dispatch.index.pathKey() }),
		queryClient.invalidateQueries({
			queryKey: trpc.dispatch.workspaceSummary.queryKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: trpc.dispatch.backlog.pathKey(),
		}),
		queryClient.invalidateQueries({ queryKey: trpc.dispatch.detail.pathKey() }),
		queryClient.invalidateQueries({
			queryKey: trpc.dispatch.dispatchOverviewV2.pathKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: trpc.dispatch.exceptions.pathKey(),
		}),
		queryClient.invalidateQueries({
			queryKey: trpc.dispatch.driverWorkload.queryKey(),
		}),
	]);
}
