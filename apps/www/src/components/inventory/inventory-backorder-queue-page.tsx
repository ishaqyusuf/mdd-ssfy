"use client";

import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { buildSalesInventoryPrintViewerUrl } from "@/modules/sales-print/application/inventory-print-request";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

type BackorderQueueInput =
	RouterInputs["inventories"]["salesBackorderQueue"];
type BackorderQueue = RouterOutputs["inventories"]["salesBackorderQueue"];
type BackorderQueueItem = BackorderQueue["items"][number];
type BackorderStatus = BackorderQueueItem["status"] | "all";

const statusFilters: Array<{ label: string; value: BackorderStatus }> = [
	{ label: "All", value: "all" },
	{ label: "Awaiting Inbound", value: "awaiting_inbound" },
	{ label: "Backordered", value: "backordered" },
	{ label: "Ready To Ship", value: "ready_to_ship_remaining" },
];

const statusToneClassName: Record<Exclude<BackorderStatus, "all">, string> = {
	awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
	backordered: "border-rose-200 bg-rose-50 text-rose-700",
	ready_to_ship_remaining: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function getQueueInput(status: BackorderStatus): BackorderQueueInput {
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
	component: BackorderQueueItem["blockerComponents"][number],
) {
	return (
		component.componentName ||
		component.inventoryName ||
		component.inventoryCategoryName ||
		component.inventoryVariantSku ||
		`Component ${component.id || "N/A"}`
	);
}

export function InventoryBackorderQueuePage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<BackorderStatus>("all");
	const input = useMemo(() => getQueueInput(status), [status]);

	const queueQuery = useQuery(
		trpc.inventories.salesBackorderQueue.queryOptions(input, {
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		}),
	);
	const queue = queueQuery.data;
	const items = queue?.items ?? [];
	const summary = queue?.summary;
	const printUrl = useMemo(
		() =>
			buildSalesInventoryPrintViewerUrl({
				salesIds: items.map((item) => item.salesOrderId),
				mode: "packing-slip",
			}),
		[items],
	);
	const canPrint = items.some((item) => item.salesOrderId);

	const allocateReceived = useMutation(
		trpc.inventories.allocateReceivedInboundToBackorders.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.ok ? "Backorders released" : "No stock allocated",
					description: `${formatQty(data.allocatedQty)} received units reserved across ${data.touchedComponentCount} components.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.inventories.salesBackorderQueue.queryKey(input),
				});
			},
		}),
	);
	const shipAvailable = useMutation(
		trpc.inventories.shipAvailableSalesInventory.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.ok ? "Available quantity shipped" : "Nothing shipped",
					description: `${formatQty(data.shippedQty)} shipped, ${formatQty(data.backorderedQty)} left on backorder.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.inventories.salesBackorderQueue.queryKey(input),
				});
			},
		}),
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">Backorder Queue</h2>
					<p className="max-w-3xl text-sm text-muted-foreground">
						Track partially shipped sales, inbound blockers, and received
						inventory that can be released back to open order quantities.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button asChild type="button" variant="outline">
						<Link href="/inventory/partial-shipments">
							<Icons.Truck className="mr-2 size-4" />
							Partial Shipments
						</Link>
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={!canPrint}
						onClick={() => {
							window.open(printUrl, "_blank", "noopener,noreferrer");
						}}
					>
						<Icons.FileText className="mr-2 size-4" />
						Print Backorders
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							allocateReceived.mutate({
								limit: 100,
								note: "Manual backorder queue release.",
							})
						}
						disabled={allocateReceived.isPending}
					>
						<Icons.RefreshCw className="mr-2 size-4" />
						Allocate Received
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Queue Lines
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.totalCount)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Remaining Qty
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.remainingQty)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Backordered Qty
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.backorderedQty)}
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Inbound / Received
					</div>
					<div className="text-2xl font-semibold">
						{formatQty(summary?.inboundQty)} /{" "}
						{formatQty(summary?.receivedQty)}
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
								<div className="min-w-0 space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<div className="font-medium">
											Order {item.orderId || item.salesOrderId || "N/A"}
										</div>
										<Badge
											variant="outline"
											className={`capitalize ${statusToneClassName[item.status]}`}
										>
											{formatLabel(item.status)}
										</Badge>
										{item.inventoryStatus ? (
											<Badge variant="outline" className="capitalize">
												{formatLabel(item.inventoryStatus)}
											</Badge>
										) : null}
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
										<span>Allocated {formatQty(item.allocatedQty)}</span>
										<span>Available {formatQty(item.availableToShipQty)}</span>
										<span>Picked {formatQty(item.pickedQty)}</span>
										<span>Shipped {formatQty(item.shippedQty)}</span>
										<span>Remaining {formatQty(item.remainingQty)}</span>
									</div>
								</div>

								<div className="flex flex-col gap-3 xl:min-w-[440px]">
									<div className="grid gap-2 text-sm md:grid-cols-3">
										<div className="rounded-md border p-3">
											<div className="text-xs uppercase text-muted-foreground">
												Backorder
											</div>
											<div className="text-lg font-semibold">
												{formatQty(item.backorderedQty)}
											</div>
										</div>
										<div className="rounded-md border p-3">
											<div className="text-xs uppercase text-muted-foreground">
												Inbound
											</div>
											<div className="text-lg font-semibold">
												{formatQty(item.inboundQty)}
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
												note: "Partial shipment from backorder queue.",
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
													Backorder{" "}
													{formatQty(component.backorderedQty)}
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
						<div className="font-medium">No backorders found</div>
						<div className="mt-1 text-sm text-muted-foreground">
							{queueQuery.isLoading
								? "Loading backorder queue..."
								: "Open shortages and partial shipment lines will appear here."}
						</div>
					</Card>
				) : null}
			</div>
		</div>
	);
}
