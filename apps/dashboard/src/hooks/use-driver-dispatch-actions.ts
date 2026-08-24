"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDriverDispatchActions() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();

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
		trpc.dispatch.startDispatch.mutationOptions({ onSuccess: invalidate }),
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
		completeWithProof,
		reportException,
		invalidate,
		onStartTrip(input: { dispatchId: number; salesId: number }) {
			return startTrip.mutateAsync({
				meta: {
					salesId: input.salesId,
					authorId: Number(auth.id || 0),
					authorName: auth.name || "Driver",
				},
				startDispatch: { dispatchId: input.dispatchId },
			});
		},
	};
}
