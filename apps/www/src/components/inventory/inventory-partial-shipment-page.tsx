"use client";

import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

type PartialShipmentInput =
	RouterInputs["inventories"]["salesPartialShipmentQueue"];
type PartialShipmentQueue =
	RouterOutputs["inventories"]["salesPartialShipmentQueue"];
type PartialShipmentItem = PartialShipmentQueue["items"][number];
type PartialShipmentStatus = PartialShipmentItem["partialStatus"] | "all";

const statusFilters: Array<{ label: string; value: PartialShipmentStatus }> = [
	{ label: "All", value: "all" },
	{ label: "Available Now", value: "available_now" },
	{ label: "Held", value: "held_until_complete" },
	{ label: "Awaiting Inbound", value: "awaiting_inbound" },
	{ label: "Backordered", value: "backordered" },
	{ label: "Ready Remaining", value: "ready_to_ship_remaining" },
];

const statusToneClassName: Record<Exclude<PartialShipmentStatus, "all">, string> =
	{
		available_now: "border-emerald-200 bg-emerald-50 text-emerald-700",
		held_until_complete: "border-slate-200 bg-slate-50 text-slate-700",
		awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
		backordered: "border-rose-200 bg-rose-50 text-rose-700",
		ready_to_ship_remaining: "border-blue-200 bg-blue-50 text-blue-700",
	};

function getQueueInput(status: PartialShipmentStatus): PartialShipmentInput {
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

function getComponentLabel(
	component: PartialShipmentItem["blockerComponents"][number],
) {
	return (
		component.componentName ||
		component.inventoryName ||
		component.inventoryCategoryName ||
		component.inventoryVariantSku ||
		`Component ${component.id || "N/A"}`
	);
}

export function InventoryPartialShipmentPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<PartialShipmentStatus>("all");
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
	};

	const setHold = useMutation(
		trpc.inventories.setSalesInventoryLineFulfillmentHold.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.holdUntilComplete
						? "Line held until complete"
						: "Partial shipment allowed",
					variant: "success",
				});
				invalidateQueues();
			},
		}),
	);
	const shipAvailable = useMutation(
		trpc.inventories.shipAvailableSalesInventory.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.ok ? "Available quantity shipped" : "Nothing shipped",
					description:
						data.heldLineCount > 0
							? `${data.heldLineCount} held line skipped. ${formatQty(data.shippedQty)} shipped.`
							: `${formatQty(data.shippedQty)} shipped, ${formatQty(data.backorderedQty)} left on backorder.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				invalidateQueues();
			},
		}),
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">Partial Shipments</h2>
					<p className="max-w-3xl text-sm text-muted-foreground">
						Review available quantity, held lines, remaining fulfillment, and
						inbound blockers before shipping partial orders.
					</p>
				</div>
				<Button asChild type="button" variant="outline">
					<Link href="/inventory/backorders">
						<Icons.PackageOpen className="mr-2 size-4" />
						Backorders
					</Link>
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-5">
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Open Lines
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.totalCount)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Available Now
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.availableToShipQty)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Held Lines
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.heldLineCount)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Remaining
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.remainingQty)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Inbound
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.inboundQty)}
					</div>
				</Card>
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

					return (
						<Card
							key={`${item.salesOrderId}-${item.lineItemId}`}
							className="p-4"
						>
							<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
								<div className="min-w-0 space-y-3">
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
											<Badge variant="outline" className="capitalize">
												Hold until complete
											</Badge>
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
										<span>Backorder {formatQty(item.backorderedQty)}</span>
									</div>
									<div className="flex items-center gap-3 rounded-md border bg-muted/20 p-3">
										<Switch
											checked={item.holdUntilComplete}
											disabled={!item.lineItemId || setHold.isPending}
											onCheckedChange={(checked) => {
												if (!item.lineItemId) return;
												setHold.mutate({
													lineItemId: item.lineItemId,
													holdUntilComplete: checked,
													note: checked
														? "Held from partial shipment screen."
														: "Partial shipment allowed from partial shipment screen.",
												});
											}}
										/>
										<div className="min-w-0">
											<div className="text-sm font-medium">
												Hold until complete
											</div>
											<div className="text-xs text-muted-foreground">
												Partial ship is blocked until all remaining quantity is
												available.
											</div>
										</div>
									</div>
								</div>

								<div className="flex flex-col gap-3 xl:min-w-[420px]">
									<div className="grid gap-2 text-sm md:grid-cols-3">
										<div className="rounded-md border p-3">
											<div className="text-xs uppercase text-muted-foreground">
												Picked
											</div>
											<div className="text-lg font-semibold">
												{formatQty(item.pickedQty)}
											</div>
										</div>
										<div className="rounded-md border p-3">
											<div className="text-xs uppercase text-muted-foreground">
												Held Back
											</div>
											<div className="text-lg font-semibold">
												{formatQty(item.heldBackQty)}
											</div>
										</div>
										<div className="rounded-md border p-3">
											<div className="text-xs uppercase text-muted-foreground">
												Received
											</div>
											<div className="text-lg font-semibold">
												{formatQty(item.receivedQty)}
											</div>
										</div>
									</div>
									{overviewUrl ? (
										<Button asChild size="sm" variant="outline">
											<Link href={overviewUrl}>
												<Icons.ExternalLink className="mr-2 size-4" />
												Open Sale
											</Link>
										</Button>
									) : null}
									<Button
										type="button"
										size="sm"
										onClick={() => {
											if (!item.salesOrderId || !item.lineItemId) return;
											shipAvailable.mutate({
												salesOrderId: item.salesOrderId,
												lineItemIds: [item.lineItemId],
												note: "Partial shipment from partial shipment screen.",
											});
										}}
										disabled={
											shipAvailable.isPending ||
											!item.salesOrderId ||
											!item.lineItemId ||
											!item.canShipNow
										}
									>
										<Icons.Truck className="mr-2 size-4" />
										Ship Available
									</Button>
								</div>
							</div>

							{item.blockerComponents.length ? (
								<div className="mt-4 grid gap-2">
									{item.blockerComponents.map((component) => (
										<div
											key={component.id}
											className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 text-sm md:flex-row md:items-center md:justify-between"
										>
											<div className="min-w-0">
												<div className="font-medium">
													{getComponentLabel(component)}
												</div>
												<div className="text-muted-foreground">
													{component.inventoryVariantSku
														? `${component.inventoryVariantSku} - `
														: ""}
													{formatLabel(component.inventoryStatus)} /{" "}
													{formatLabel(component.status)}
												</div>
											</div>
											<div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
												<span>
													Need {formatQty(component.remainingQty)}
												</span>
												<span>
													Allocated {formatQty(component.allocatedQty)}
												</span>
												<span>
													Inbound {formatQty(component.inboundQty)}
												</span>
												<span>
													Received {formatQty(component.receivedQty)}
												</span>
											</div>
										</div>
									))}
								</div>
							) : null}
						</Card>
					);
				})}

				{!items.length ? (
					<Card className="p-8 text-center">
						<div className="font-medium">No partial shipments found</div>
						<div className="mt-1 text-sm text-muted-foreground">
							{queueQuery.isLoading
								? "Loading partial shipment queue..."
								: "Inventory-backed lines with available, held, or blocked remaining quantity will appear here."}
						</div>
					</Card>
				) : null}
			</div>
		</div>
	);
}
