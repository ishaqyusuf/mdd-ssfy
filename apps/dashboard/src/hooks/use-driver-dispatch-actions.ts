"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDriverDispatchActions() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const invalidate = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.driverManifest.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.driverWorkQueue.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.driverWorkQueueSummary.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.manifest.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.dispatchOverviewV2.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.packingReports.context.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.detail.pathKey(),
			}),
		]);
	};

	const startTrip = useMutation(
		trpc.dispatch.startTrip.mutationOptions({ onSuccess: invalidate }),
	);
	const startReadyRoute = useMutation(
		trpc.dispatch.startReadyRoute.mutationOptions({ onSuccess: invalidate }),
	);
	const normalizeDestination = useMutation(
		trpc.dispatch.normalizeDestination.mutationOptions({
			onSuccess: invalidate,
		}),
	);
	const completeWithProof = useMutation(
		trpc.dispatch.completeDispatchWithProof.mutationOptions({
			onSuccess: invalidate,
		}),
	);
	const reportException = useMutation(
		trpc.dispatch.reportException.mutationOptions({ onSuccess: invalidate }),
	);

	return {
		startTrip,
		startReadyRoute,
		normalizeDestination,
		completeWithProof,
		reportException,
		invalidate,
		onStartTrip(input: { dispatchId: number }) {
			return startTrip.mutateAsync({
				dispatchId: input.dispatchId,
				requestId: crypto.randomUUID(),
			});
		},
	};
}
