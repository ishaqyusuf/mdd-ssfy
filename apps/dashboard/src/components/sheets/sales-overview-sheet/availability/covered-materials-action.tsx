"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useRef } from "react";
import { synchronizationResultMessage } from "./synchronization-result-message";

export function CoveredMaterialsAction({
	salesOrderId,
	showPending = false,
	onOpenInventory,
}: { salesOrderId: number; showPending?: boolean; onOpenInventory?: () => void }) {
	const trpc = useTRPC();
	const client = useQueryClient();
	const query = useQuery(
		trpc.sales.coveredProductionMaterials.queryOptions({ salesOrderId }),
	);
	const locked = useRef(false);
	const request = useRef<{ revision: string; key: string } | null>(null);
	const mutation = useMutation(
		trpc.sales.applyCoveredProductionMaterials.mutationOptions({
			onSuccess: async (result) => {
				const refresh = await Promise.allSettled([
					client.invalidateQueries({
						queryKey: trpc.sales.coveredProductionMaterials.queryKey({
							salesOrderId,
						}),
					}),
					client.invalidateQueries({
						queryKey: trpc.sales.productionAvailability.queryKey({
							salesOrderId,
						}),
					}),
				]);
				toast({
					title: "Materials synchronized",
					description: refresh.some((item) => item.status === "rejected")
						? "Saved. Refresh Production to load the latest information."
						: synchronizationResultMessage(result),
					variant: "success",
				});
			},
			onSettled: () => {
				locked.current = false;
			},
		}),
	);
	if (query.isLoading)
		return (
			<p role="status" className="text-xs text-muted-foreground">
				Checking assignment material coverage…
			</p>
		);
	if (query.isError)
		return (
			<Button size="sm" variant="outline" onClick={() => query.refetch()}>
				Retry material synchronization
			</Button>
		);
	const summary = query.data;
	if (
		!summary ||
		(!showPending &&
			!summary.eligibleReviewCount &&
			!summary.applicableAllocationCount &&
			!summary.applicableReceivedQty &&
			!summary.applicableDemandCount &&
			!summary.repairableAllocationCount &&
			!summary.repairableClassificationCount &&
			!summary.blockedReviewCount &&
			!summary.blockers?.length)
	)
		return null;
	const reviewOnly = summary.pendingReviewCount > 0 && !summary.pendingMaterialQty && !summary.applicableAllocationCount && !summary.applicableReceivedQty && !summary.applicableDemandCount && !summary.repairableAllocationCount && !summary.repairableClassificationCount;
	return (
		<section
			aria-label="Synchronize assignment materials"
			className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3"
		>
			<div className="space-y-1">
				<h3 className="text-sm font-medium">
					{summary.canApply ? reviewOnly ? "Materials are ready — submitted work needs approval" : "Received materials need to be synced to assignments" : "Material synchronization needs attention"}
				</h3>
				<p className="text-xs text-muted-foreground">
					{summary.canApply ? reviewOnly ? "Sync will recheck the pending reviews and approve eligible submitted work in one step" : "Sync received materials, reconcile assignment records, and approve eligible submitted work in one step" : "Some material or production records still need to be resolved"}
					{summary.workerMode ? " for your assignments" : ""}.
				</p>
				{summary.canSynchronize === false && (
					<p className="text-xs text-muted-foreground">
						Contact your supervisor to resolve the remaining material
						quantities.
					</p>
				)}
				{summary.canApply && (summary.repairableAllocationCount > 0 || summary.repairableClassificationCount > 0) && (
					<p className="text-xs text-muted-foreground">
						Sync will repair stale material suggestions and inventory production setup where the records can be verified.
					</p>
				)}
				{summary.blockers?.map((message, index) => <p key={`${index}-${message}`} className="text-xs text-muted-foreground">{message}</p>)}
				{!summary.canApply && !summary.blockers?.length && summary.canSynchronize !== false && <p className="text-xs text-muted-foreground">Open inventory to check material coverage. Submitted work may also need its assignment details corrected before approval.</p>}
				{mutation.error && (
					<p role="alert" className="text-sm text-destructive">
						{mutation.error.message}
					</p>
				)}
			</div>
			<div className="flex flex-wrap gap-2">
				{!summary.canApply && !summary.workerMode && onOpenInventory && <Button size="sm" variant="outline" onClick={onOpenInventory}>Open inventory</Button>}
				{summary.canApply && (
					<Button
						size="sm"
						disabled={mutation.isPending || query.isFetching}
						onClick={() => {
							if (locked.current) return;
							locked.current = true;
							if (request.current?.revision !== summary.revision)
								request.current = {
									revision: summary.revision,
									key: crypto.randomUUID(),
								};
							mutation.mutate({
								salesOrderId,
								expectedRevision: summary.revision,
								idempotencyKey: request.current.key,
							});
						}}
					>
						{mutation.isPending ? "Synchronizing…" : "Sync"}
					</Button>
				)}
				{mutation.error && (
					<Button
						size="sm"
						variant="outline"
						disabled={mutation.isPending || query.isFetching}
						onClick={async () => {
							const refreshed = await query.refetch();
							if (!refreshed.isError) mutation.reset();
						}}
					>
						Refresh materials
					</Button>
				)}
			</div>
		</section>
	);
}
