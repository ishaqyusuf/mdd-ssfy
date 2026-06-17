"use client";

import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

type DispatchQueueInput =
	RouterInputs["inventories"]["salesPartialShipmentQueue"];
type DispatchQueue = RouterOutputs["inventories"]["salesPartialShipmentQueue"];
type DispatchQueueItem = DispatchQueue["items"][number];
type DispatchStatus = DispatchQueueItem["partialStatus"] | "all";

const statusFilters: Array<{ label: string; value: DispatchStatus }> = [
	{ label: "All", value: "all" },
	{ label: "Available", value: "available_now" },
	{ label: "Ready Remaining", value: "ready_to_ship_remaining" },
	{ label: "Held", value: "held_until_complete" },
	{ label: "Awaiting Inbound", value: "awaiting_inbound" },
	{ label: "Backordered", value: "backordered" },
];

const statusToneClassName: Record<Exclude<DispatchStatus, "all">, string> = {
	available_now: "border-emerald-200 bg-emerald-50 text-emerald-700",
	ready_to_ship_remaining: "border-blue-200 bg-blue-50 text-blue-700",
	held_until_complete: "border-slate-200 bg-slate-50 text-slate-700",
	awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
	backordered: "border-rose-200 bg-rose-50 text-rose-700",
};

function getQueueInput(status: DispatchStatus): DispatchQueueInput {
	return {
		limit: 100,
		statuses: status === "all" ? null : [status],
	};
}

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatLabel(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "unknown";
}

function getSalesOverviewUrl(orderId: string | null) {
	if (!orderId) return null;
	const params = new URLSearchParams({
		overviewId: orderId,
		overviewType: "sales",
		overviewMode: "sales",
		overviewTab: "packing",
	});
	return `/sales-book/orders/overview-v2?${params.toString()}`;
}

function getDispatchFulfillmentErrorDescription(error: unknown) {
	const message =
		error instanceof Error ? error.message : String(error || "Unknown error");
	if (message.includes("Picked inventory allocation was already claimed")) {
		return "The picked allocation was already handled by another action. Refresh the queue and retry the remaining line.";
	}
	return message;
}

function getLineInput(item: DispatchQueueItem) {
	return {
		salesOrderId: item.salesOrderId,
		lineItemIds: item.lineItemId ? [item.lineItemId] : [],
	};
}

function getAllocationInput(item: DispatchQueueItem, allocationId: number) {
	return {
		...getLineInput(item),
		allocationIds: [allocationId],
	};
}

function MetricCard({ label, value }: { label: string; value: string }) {
	return (
		<Card className="p-4">
			<div className="text-xs uppercase text-muted-foreground">{label}</div>
			<div className="text-2xl font-semibold">{value}</div>
		</Card>
	);
}

export function InventoryDispatchModePage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<DispatchStatus>("available_now");
	const input = useMemo(() => getQueueInput(status), [status]);

	const queueQuery = useQuery(
		trpc.inventories.salesPartialShipmentQueue.queryOptions(input, {
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		}),
	);
	const queue = queueQuery.data;
	const items = queue?.items ?? [];
	const summary = queue?.summary;

	const invalidateQueues = () => {
		queryClient.invalidateQueries({
			queryKey: trpc.inventories.salesPartialShipmentQueue.queryKey(input),
		});
		queryClient.invalidateQueries({
			queryKey: trpc.inventories.salesBackorderQueue.queryKey({
				limit: 100,
				statuses: null,
			}),
		});
		queryClient.invalidateQueries({
			queryKey: trpc.inventories.inventoryOperationsSummary.queryKey(),
		});
	};

	const assign = useMutation(
		trpc.inventories.assignInventoryDispatchAllocations.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.ok ? "Inventory assigned" : "Nothing assigned",
					description: `${data.transitionedCount} allocations reserved, ${data.skippedCount} skipped.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				invalidateQueues();
			},
		}),
	);
	const pack = useMutation(
		trpc.inventories.packInventoryDispatchAllocations.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.ok ? "Inventory packed" : "Nothing packed",
					description: `${data.transitionedCount} allocations picked, ${data.skippedCount} skipped.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				invalidateQueues();
			},
		}),
	);
	const release = useMutation(
		trpc.inventories.releaseInventoryDispatchAllocations.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.ok ? "Inventory released" : "Nothing released",
					description: `${data.transitionedCount} allocations released, ${data.skippedCount} skipped.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				invalidateQueues();
			},
		}),
	);
	const fulfill = useMutation(
		trpc.inventories.fulfillInventoryDispatch.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.ok ? "Inventory dispatch fulfilled" : "Nothing fulfilled",
					description: `${formatQty(data.shippedQty)} shipped, ${formatQty(data.consumedAllocationQty)} consumed.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				invalidateQueues();
			},
			onError(error) {
				toast({
					title: "Inventory dispatch not fulfilled",
					description: getDispatchFulfillmentErrorDescription(error),
					variant: "destructive",
				});
				invalidateQueues();
			},
		}),
	);

	const isMutating =
		assign.isPending || pack.isPending || fulfill.isPending || release.isPending;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">Inventory Dispatch Mode</h2>
					<p className="max-w-3xl text-sm text-muted-foreground">
						Reserve, pick, fulfill, or release inventory-backed sale lines using
						the stock allocation workflow.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button asChild type="button" variant="outline">
						<Link href="/inventory/partial-shipments">
							<Icons.Truck className="mr-2 size-4" />
							Partial Shipments
						</Link>
					</Button>
					<Button asChild type="button" variant="outline">
						<Link href="/inventory/backorders">
							<Icons.PackageOpen className="mr-2 size-4" />
							Backorders
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-5">
				<MetricCard label="Lines" value={formatQty(summary?.totalCount)} />
				<MetricCard
					label="Available"
					value={formatQty(summary?.availableToShipQty)}
				/>
				<MetricCard label="Remaining" value={formatQty(summary?.remainingQty)} />
				<MetricCard
					label="Backordered"
					value={formatQty(summary?.backorderedQty)}
				/>
				<MetricCard label="Held" value={formatQty(summary?.heldLineCount)} />
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{statusFilters.map((filter) => (
					<Button
						key={filter.value}
						type="button"
						size="sm"
						variant={status === filter.value ? "default" : "outline"}
						onClick={() => setStatus(filter.value)}
					>
						{filter.label}
					</Button>
				))}
			</div>

			<div className="grid gap-3">
				{items.map((item) => {
					const overviewUrl = getSalesOverviewUrl(item.orderId);
					const canFulfill = item.availableToShipQty > 0 && !item.holdUntilComplete;
					const lineInput = getLineInput(item);

					return (
						<Card
							key={`${item.salesOrderId}-${item.lineItemId}`}
							className="p-4"
						>
							<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
								<div className="min-w-0 space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<div className="font-medium">
											Order {item.orderId || item.salesOrderId || "N/A"}
										</div>
										<Badge
											variant="outline"
											className={`capitalize ${statusToneClassName[item.partialStatus]}`}
										>
											{formatLabel(item.partialStatus)}
										</Badge>
										{item.holdUntilComplete ? (
											<Badge variant="outline">Hold</Badge>
										) : null}
									</div>
									<div className="text-sm text-muted-foreground">
										{item.customerName || "Unknown customer"} -{" "}
										{item.title || item.uid || "Untitled line item"}
									</div>
									<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
										<span>Ordered {formatQty(item.orderedQty)}</span>
										<span>Available {formatQty(item.availableToShipQty)}</span>
										<span>Shipped {formatQty(item.shippedQty)}</span>
										<span>Remaining {formatQty(item.remainingQty)}</span>
										<span>Inbound {formatQty(item.inboundQty)}</span>
									</div>
									<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
										<span>Sale #{item.salesOrderId || "N/A"}</span>
										<span>Line #{item.lineItemId || "N/A"}</span>
										{item.allocationIdsByStatus.approved.length ? (
											<span>
												Approved #{item.allocationIdsByStatus.approved.join(", #")}
											</span>
										) : null}
										{item.allocationIdsByStatus.reserved.length ? (
											<span>
												Reserved #{item.allocationIdsByStatus.reserved.join(", #")}
											</span>
										) : null}
										{item.allocationIdsByStatus.picked.length ? (
											<span>
												Picked #{item.allocationIdsByStatus.picked.join(", #")}
											</span>
										) : null}
									</div>
								</div>
								<div className="flex shrink-0 flex-wrap gap-2">
									{overviewUrl ? (
										<Button asChild variant="outline" size="sm">
											<Link href={overviewUrl}>Sale</Link>
										</Button>
									) : null}
									{item.allocationIdsByStatus.approved.map((allocationId) => (
										<Button
											key={`assign-${allocationId}`}
											type="button"
											variant="outline"
											size="sm"
											disabled={isMutating}
											onClick={() =>
												assign.mutate({
													...getAllocationInput(item, allocationId),
													note: "Assigned from inventory dispatch mode.",
												})
											}
										>
											Assign #{allocationId}
										</Button>
									))}
									{item.allocationIdsByStatus.reserved.map((allocationId) => (
										<Button
											key={`pack-${allocationId}`}
											type="button"
											variant="outline"
											size="sm"
											disabled={isMutating}
											onClick={() =>
												pack.mutate({
													...getAllocationInput(item, allocationId),
													note: "Packed from inventory dispatch mode.",
												})
											}
										>
											Pack #{allocationId}
										</Button>
									))}
									{item.allocationIdsByStatus.picked.map((allocationId) => (
										<Button
											key={`fulfill-${allocationId}`}
											type="button"
											size="sm"
											disabled={isMutating || !canFulfill}
											onClick={() =>
												fulfill.mutate({
													...getAllocationInput(item, allocationId),
													deliveryMode: "inventory_dispatch",
													note: "Fulfilled from inventory dispatch mode.",
												})
											}
										>
											Fulfill #{allocationId}
										</Button>
									))}
									{item.allocationIdsByStatus.reserved.map((allocationId) => (
										<Button
											key={`release-${allocationId}`}
											type="button"
											variant="outline"
											size="sm"
											disabled={isMutating}
											onClick={() =>
												release.mutate({
													...getAllocationInput(item, allocationId),
													note: "Released from inventory dispatch mode.",
												})
											}
										>
											Release #{allocationId}
										</Button>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isMutating || !item.lineItemId}
										onClick={() =>
											assign.mutate({
												...lineInput,
												note: "Assigned from inventory dispatch mode.",
											})
										}
									>
										<Icons.PackageOpen className="mr-2 size-4" />
										Assign
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isMutating || !item.lineItemId}
										onClick={() =>
											pack.mutate({
												...lineInput,
												note: "Packed from inventory dispatch mode.",
											})
										}
									>
										<Icons.Truck className="mr-2 size-4" />
										Pack
									</Button>
									<Button
										type="button"
										size="sm"
										disabled={isMutating || !canFulfill}
										onClick={() =>
											fulfill.mutate({
												...lineInput,
												deliveryMode: "inventory_dispatch",
												note: "Fulfilled from inventory dispatch mode.",
											})
										}
									>
										<Icons.Truck className="mr-2 size-4" />
										Fulfill
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isMutating || !item.lineItemId}
										onClick={() =>
											release.mutate({
												...lineInput,
												note: "Released from inventory dispatch mode.",
											})
										}
									>
										<Icons.RefreshCw className="mr-2 size-4" />
										Release
									</Button>
								</div>
							</div>
						</Card>
					);
				})}
				{queueQuery.isFetching ? (
					<Card className="p-6 text-sm text-muted-foreground">
						Loading inventory dispatch lines...
					</Card>
				) : null}
				{!queueQuery.isFetching && !items.length ? (
					<Card className="p-8 text-center text-sm text-muted-foreground">
						No inventory dispatch lines found.
					</Card>
				) : null}
			</div>
		</div>
	);
}
