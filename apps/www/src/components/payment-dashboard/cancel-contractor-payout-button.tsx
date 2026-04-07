"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { Ban } from "lucide-react";

export function CancelContractorPayoutButton({
	paymentId,
	isCancelled,
	variant = "destructive",
	onSuccess,
}: {
	paymentId: number;
	isCancelled?: boolean;
	variant?: "destructive" | "outline";
	onSuccess?: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const mutation = useMutation(
		trpc.jobs.cancelContractorPayment.mutationOptions({
			onSuccess: async (data) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.contractorPayouts.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.contractorPayoutOverview.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentDashboard.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.paymentPortal.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.jobs.getJobs.pathKey(),
					}),
				]);

				toast({
					title: "Payout cancelled",
					description: `${data.revertedJobs} job${data.revertedJobs === 1 ? "" : "s"} moved back to unpaid.`,
					variant: "success",
				});
				onSuccess?.();
			},
			onError: (error) => {
				toast({
					title: "Unable to cancel payout",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (!paymentId) return null;

	return (
		<Button
			type="button"
			variant={variant}
			className="gap-2"
			disabled={isCancelled || mutation.isPending}
			onClick={() => {
				if (
					!window.confirm(
						"This will keep the payout record, detach its jobs, and move them back to unpaid. Continue?",
					)
				) {
					return;
				}

				const note = window.prompt("Optional cancellation note", "");

				mutation.mutate({
					paymentId,
					note: note?.trim() || undefined,
				});
			}}
		>
			<Ban className="size-4" />
			{isCancelled
				? "Cancelled"
				: mutation.isPending
					? "Cancelling..."
					: "Cancel Payout"}
		</Button>
	);
}
