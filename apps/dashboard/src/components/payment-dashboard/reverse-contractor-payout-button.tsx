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

export function ReverseContractorPayoutButton({
	paymentId,
	isCancelled,
	variant = "outline",
	onSuccess,
}: {
	paymentId: number;
	isCancelled?: boolean;
	variant?: "outline" | "default";
	onSuccess?: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState("");
	const mutation = useMutation(
		trpc.jobs.reverseCancelledContractorPayment.mutationOptions({
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
					title: "Payout restored",
					description: `${data.restoredJobs} job${data.restoredJobs === 1 ? "" : "s"} linked back to the payout.`,
					variant: "success",
				});
				setNote("");
				setOpen(false);
				onSuccess?.();
			},
			onError: (error) => {
				toast({
					title: "Unable to reverse payout",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (!paymentId || !isCancelled) return null;

	return (
		<>
			<Button
				type="button"
				variant={variant}
				className="gap-2"
				disabled={mutation.isPending}
				onClick={() => setOpen(true)}
			>
				<Icons.RotateCcw className="size-4" />
				{mutation.isPending ? "Reversing..." : "Reverse Cancel"}
			</Button>

			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (mutation.isPending) return;
					setOpen(nextOpen);
					if (!nextOpen) setNote("");
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reverse Payout Cancellation</DialogTitle>
						<DialogDescription>
							This restores the cancelled payout only if every cancelled job is
							still intact, unpaid, and matches the stored payout totals.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-2">
						<Label htmlFor={`reverse-payout-note-${paymentId}`}>
							Reversal note
						</Label>
						<Textarea
							id={`reverse-payout-note-${paymentId}`}
							placeholder="Optional reason for restoring this payout"
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
							Keep Cancelled
						</Button>
						<Button
							type="button"
							disabled={mutation.isPending}
							onClick={() =>
								mutation.mutate({
									paymentId,
									note: note.trim() || undefined,
								})
							}
						>
							{mutation.isPending ? "Reversing..." : "Confirm Reversal"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
