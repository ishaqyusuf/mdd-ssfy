"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Button } from "@gnd/ui/button";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

import { useTRPC } from "@/trpc/client";

type InboundNeedsApplicationActionsProps = {
	inboundId: number;
	disabled?: boolean;
	onChanged?: () => void | Promise<void>;
};

export function InboundNeedsApplicationActions({
	inboundId,
	disabled = false,
	onChanged,
}: InboundNeedsApplicationActionsProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const detailQuery = useQuery(
		trpc.inventories.inboundShipmentDetail.queryOptions({ inboundId }),
	);
	const mutation = useMutation(
		trpc.inventories.updateInboundShipmentNeedsApplication.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipmentDetail.queryKey({
							inboundId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipments.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.orderInboundShipments.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.salesInventoryOverview.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundDemandQueue.pathKey(),
					}),
				]);
				await onChanged?.();
				toast({
					title:
						result.operation === "apply"
							? "Inbound applied to needs"
							: "Inbound unapplied from needs",
					description:
						result.operation === "apply"
							? `${result.updatedDemandCount} linked material need${result.updatedDemandCount === 1 ? "" : "s"} updated.`
							: `${result.updatedDemandCount} linked material need${result.updatedDemandCount === 1 ? "" : "s"} restored.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to update material needs",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const application = detailQuery.data?.needsApplication;
	const isPending = mutation.isPending;
	const applyLabel =
		application?.state === "applied"
			? "Applied to needs"
			: application?.state === "not_applicable"
				? "No linked needs"
				: application?.state === "not_received"
					? "Mark Received first"
					: "Apply to needs";
	const showUnapply = application?.state === "applied";

	return (
		<div className="flex flex-wrap gap-2">
			<Button
				type="button"
				size="sm"
				variant={application?.state === "applied" ? "outline" : "default"}
				disabled={
					disabled ||
					isPending ||
					detailQuery.isLoading ||
					!application?.canApply
				}
				onClick={() =>
					mutation.mutate({ inboundId, operation: "apply" })
				}
			>
				{isPending && mutation.variables?.operation === "apply"
					? "Applying…"
					: applyLabel}
			</Button>
			{showUnapply ? (
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={disabled || isPending || !application?.canUnapply}
						>
							{isPending && mutation.variables?.operation === "unapply"
								? "Unapplying…"
								: "Unapply"}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogTitle>Unapply inbound from needs?</AlertDialogTitle>
							<AlertDialogDescription>
								This restores the exact material-need values that existed before
								this inbound was applied. It does not reverse physical stock.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								disabled={isPending || !application?.canUnapply}
								onClick={() =>
									mutation.mutate({ inboundId, operation: "unapply" })
								}
							>
								Unapply from needs
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			) : null}
		</div>
	);
}
