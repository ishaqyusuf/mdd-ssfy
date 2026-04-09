"use client";

import { Icons } from "@gnd/ui/icons";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Label } from "@gnd/ui/label";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

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
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState("");
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
					queryClient.invalidateQueries({
						queryKey: trpc.notes.activityTree.pathKey(),
					}),
				]);

				toast({
					title: "Payout cancelled",
					description: `${data.revertedJobs} job${data.revertedJobs === 1 ? "" : "s"} moved back to unpaid.`,
					variant: "success",
				});
				setNote("");
				setOpen(false);
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
		<>
			<Button
				type="button"
				variant={variant}
				className="gap-2"
				disabled={isCancelled || mutation.isPending}
				onClick={() => setOpen(true)}
			>
				<Icons.Ban className="size-4" />
				{isCancelled
					? "Cancelled"
					: mutation.isPending
						? "Cancelling..."
						: "Cancel Payout"}
			</Button>

			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (mutation.isPending) return;
					setOpen(nextOpen);
					if (!nextOpen) {
						setNote("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel Payout</DialogTitle>
						<DialogDescription>
							This keeps the payout record for history, detaches its jobs, and
							moves them back to unpaid.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-2">
						<Label htmlFor={`cancel-payout-note-${paymentId}`}>
							Cancellation note
						</Label>
						<Textarea
							id={`cancel-payout-note-${paymentId}`}
							placeholder="Optional reason for cancelling this payout"
							value={note}
							onChange={(event) => setNote(event.target.value)}
							rows={4}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={mutation.isPending}
							onClick={() => {
								setOpen(false);
								setNote("");
							}}
						>
							Keep Payout
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={mutation.isPending}
							onClick={() =>
								mutation.mutate({
									paymentId,
									note: note.trim() || undefined,
								})
							}
						>
							{mutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
