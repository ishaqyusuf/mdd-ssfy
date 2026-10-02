"use client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useId, useState } from "react";

type Preview =
	RouterOutputs["inventories"]["salesInventoryTrackingChangeRepairPreview"];
export function StockTrackingReviewDialog({
	preview,
	canRepair,
	onClose,
}: { preview: Preview; canRepair: boolean; onClose: () => void }) {
	const trpc = useTRPC();
	const id = useId();
	const client = useQueryClient();
	const [selected, setSelected] = useState<number[]>([]);
	const mutation = useMutation(
		trpc.inventories.repairSalesStockTracking.mutationOptions({
			onSuccess: async (result) => {
				await client.invalidateQueries({
					queryKey: trpc.inventories.pathKey(),
				});
				const failed = result.results.filter((row) => row.state === "failed");
				toast({
					title: failed.length
						? "Some needs require review"
						: "Inventory needs refreshed",
					description: failed.length
						? failed.map((row) => `${row.orderId}: ${row.message}`).join("; ")
						: `${result.results.length} current orders refreshed. Existing stock and inbound commitments were preserved.`,
					variant: failed.length ? "destructive" : "success",
				});
				if (!failed.length) onClose();
			},
			onError: (error) =>
				toast({
					title: "Unable to refresh needs",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const rows = [
		...preview.orders.map((order) => ({
			id: order.salesOrderId,
			title: order.orderId,
			detail: `${order.pendingQty} pending units · ${order.componentNames.join(", ")}`,
		})),
		...preview.projectionCandidates.map((order) => ({
			id: order.salesOrderId,
			title: order.orderId,
			detail:
				"Saved category selection has no projected need yet. Refresh to resolve its exact quantities.",
		})),
	];
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !mutation.isPending) onClose();
			}}
		>
			<DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Review current inventory needs</DialogTitle>
					<DialogDescription>
						{preview.eligibleOrderCount} current orders have{" "}
						{preview.totalPendingQty} pending units.{" "}
						{preview.skippedReadOnlyOrderCount} read-only orders skipped.
						Quotes, archived and historical orders are excluded.
					</DialogDescription>
				</DialogHeader>
				{preview.projectionCandidates.length ? (
					<p className="text-sm">
						{preview.projectionCandidates.length} additional saved selections
						need projection review.
					</p>
				) : null}
				<div className="space-y-2">
					{rows.map((row) => (
						<label
							htmlFor={`${id}-${row.id}`}
							key={row.id}
							className="flex cursor-pointer items-start gap-3 border p-3"
						>
							<Checkbox
								id={`${id}-${row.id}`}
								checked={selected.includes(row.id)}
								disabled={!canRepair || mutation.isPending}
								onCheckedChange={(checked) =>
									setSelected((current) =>
										checked
											? [...current, row.id]
											: current.filter((id) => id !== row.id),
									)
								}
							/>
							<span>
								<span className="block font-medium">{row.title}</span>
								<span className="text-xs text-muted-foreground">
									{row.detail}
								</span>
							</span>
						</label>
					))}
					{!rows.length ? <p>No current orders need review.</p> : null}
				</div>
				{preview.truncated || preview.projectionCandidatesTruncated ? (
					<p className="text-xs text-muted-foreground">
						This is a bounded review. Refresh the list to review additional
						orders.
					</p>
				) : null}
				<DialogFooter>
					<Button
						variant="outline"
						disabled={mutation.isPending}
						onClick={onClose}
					>
						Close
					</Button>
					<Button
						disabled={
							!canRepair ||
							mutation.isPending ||
							!selected.length ||
							selected.length > 50
						}
						onClick={() =>
							mutation.mutate({
								inventoryCategoryId: preview.inventoryCategoryId,
								salesOrderIds: selected,
							})
						}
					>
						{mutation.isPending
							? "Refreshing…"
							: `Refresh ${selected.length} selected orders`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
