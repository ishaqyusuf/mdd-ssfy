"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function OrderInventoryRepairPanel({
	salesOrderId,
}: { salesOrderId: number }) {
	const trpc = useTRPC();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const previewQuery = useQuery(
		trpc.inventories.salesInventoryOrderRepairPreview.queryOptions(
			{ salesOrderId },
			{ staleTime: 30_000, refetchOnWindowFocus: false },
		),
	);
	const preview = previewQuery.data;
	const actionableKeys = useMemo(
		() =>
			new Set([
				...(preview?.actionableDemand ?? []).map((row) => `d:${row.id}`),
				...(preview?.actionableAllocations ?? []).map((row) => `a:${row.id}`),
			]),
		[preview?.actionableAllocations, preview?.actionableDemand],
	);
	useEffect(() => {
		setSelected(new Set(actionableKeys));
	}, [actionableKeys]);
	const repairMutation = useMutation(
		trpc.inventories.resolveSalesInventoryOrderRepair.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey:
							trpc.inventories.salesInventoryOrderRepairPreview.queryKey({
								salesOrderId,
							}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.salesInventoryOverview.queryKey({
							salesOrderId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.orderInboundShipments.queryKey({
							salesOrderId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.orderInboundShipmentCount.queryKey({
							salesOrderId,
						}),
					}),
				]);
				toast({
					title: "Inventory repair applied",
					description: `${result.cancelledDemandIds.length} demand row(s) cancelled and ${result.releasedAllocationIds.length} allocation(s) released.`,
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to repair inventory",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);

	if (previewQuery.isPending || previewQuery.isError || !preview) return null;
	const hasRows =
		preview.actionableDemand.length > 0 ||
		preview.actionableAllocations.length > 0 ||
		preview.reviewDemand.length > 0 ||
		preview.reviewAllocations.length > 0;
	if (!hasRows) return null;
	const selectedDemand = preview.actionableDemand.filter((row) =>
		selected.has(`d:${row.id}`),
	);
	const selectedAllocations = preview.actionableAllocations.filter((row) =>
		selected.has(`a:${row.id}`),
	);
	const reviewDemandBaselines = preview.reviewDemand.map(
		({
			id,
			lineItemComponentId,
			status,
			qty,
			qtyReceived,
			inboundShipmentItemId,
		}) => ({
			id,
			lineItemComponentId,
			status,
			qty,
			qtyReceived,
			inboundShipmentItemId,
		}),
	);
	const reviewAllocationBaselines = preview.reviewAllocations.map(
		({ id, lineItemComponentId, status, qty }) => ({
			id,
			lineItemComponentId,
			status,
			qty,
		}),
	);
	const hasReviewRows =
		reviewDemandBaselines.length > 0 || reviewAllocationBaselines.length > 0;
	const toggle = (key: string, checked: boolean) =>
		setSelected((current) => {
			const next = new Set(current);
			if (checked) next.add(key);
			else next.delete(key);
			return next;
		});
	return (
		<div className="mb-5 rounded-md border border-amber-300 bg-amber-50/60 p-3 text-amber-950">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<div className="flex items-center gap-2 text-sm font-semibold">
						Inventory repair needed{" "}
						<Badge variant="outline">Order {preview.orderId}</Badge>
					</div>
					<div className="text-xs text-amber-900/80">
						These rows are leftover from an order update. Safe rows can be
						repaired here; linked or picked rows stay in review.
					</div>
				</div>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={
						(!selected.size && !hasReviewRows) || repairMutation.isPending
					}
					onClick={() =>
						repairMutation.mutate({
							salesOrderId,
							demandBaselines: selectedDemand.map(
								({
									id,
									lineItemComponentId,
									status,
									qty,
									qtyReceived,
									inboundShipmentItemId,
								}) => ({
									id,
									lineItemComponentId,
									status,
									qty,
									qtyReceived,
									inboundShipmentItemId,
								}),
							),
							allocationBaselines: selectedAllocations.map(
								({ id, lineItemComponentId, status, qty }) => ({
									id,
									lineItemComponentId,
									status,
									qty,
								}),
							),
							reviewDemandBaselines,
							reviewAllocationBaselines,
						})
					}
				>
					{repairMutation.isPending
						? "Repairing…"
						: selected.size
							? `Repair selected (${selected.size})`
							: "Record review"}
				</Button>
			</div>
			{preview.actionableDemand.length > 0 ? (
				<div className="mt-3 space-y-1">
					<div className="text-xs font-semibold uppercase tracking-wide">
						Safe demand
					</div>
					{preview.actionableDemand.map((row) => (
						<label
							key={`d:${row.id}`}
							htmlFor={`repair-demand-${row.id}`}
							className="flex items-center gap-2 text-sm"
						>
							<Checkbox
								id={`repair-demand-${row.id}`}
								checked={selected.has(`d:${row.id}`)}
								onCheckedChange={(checked) => toggle(`d:${row.id}`, !!checked)}
							/>
							<span>
								{row.lineItemTitle || "Line item"} · {row.componentName} ·{" "}
								{row.qty} unit(s)
							</span>
						</label>
					))}
				</div>
			) : null}
			{preview.actionableAllocations.length > 0 ? (
				<div className="mt-3 space-y-1">
					<div className="text-xs font-semibold uppercase tracking-wide">
						Safe allocations
					</div>
					{preview.actionableAllocations.map((row) => (
						<label
							key={`a:${row.id}`}
							htmlFor={`repair-allocation-${row.id}`}
							className="flex items-center gap-2 text-sm"
						>
							<Checkbox
								id={`repair-allocation-${row.id}`}
								checked={selected.has(`a:${row.id}`)}
								onCheckedChange={(checked) => toggle(`a:${row.id}`, !!checked)}
							/>
							<span>
								{row.lineItemTitle || "Line item"} · {row.componentName} ·{" "}
								{row.qty} unit(s)
							</span>
						</label>
					))}
				</div>
			) : null}
			{preview.reviewDemand.length || preview.reviewAllocations.length ? (
				<div className="mt-3 border-t border-amber-200 pt-2 text-xs">
					<div className="font-semibold">
						Needs review (
						{preview.reviewDemand.length + preview.reviewAllocations.length})
					</div>
					{preview.reviewDemand.map((row) => (
						<div
							key={`rd:${row.id}`}
							className="flex items-center justify-between gap-2"
						>
							<span>
								{row.componentName} · {row.reason.replaceAll("_", " ")}
							</span>
							{row.inboundId ? (
								<Button
									type="button"
									variant="link"
									size="sm"
									className="h-auto p-0"
									onClick={() =>
										router.push(
											`/sales-book/inbounds?inboundId=${row.inboundId}`,
										)
									}
								>
									Review inbound
								</Button>
							) : null}
						</div>
					))}
					{preview.reviewAllocations.map((row) => (
						<div key={`ra:${row.id}`}>
							{row.componentName} · {row.reason.replaceAll("_", " ")}
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}
