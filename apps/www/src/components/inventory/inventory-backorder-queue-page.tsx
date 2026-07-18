"use client";

import { InventoryBackordersColumnVisibility } from "@/components/tables-2/inventory-backorders/column-visibility";
import { DataTable } from "@/components/tables-2/inventory-backorders/data-table";
import { buildSalesInventoryPrintViewerUrl } from "@/modules/sales-print/application/inventory-print-request";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { useMemo, useState } from "react";

type BackorderQueueInput = RouterInputs["inventories"]["salesBackorderQueue"];
type BackorderQueue = RouterOutputs["inventories"]["salesBackorderQueue"];
type BackorderQueueItem = BackorderQueue["items"][number];
type BackorderStatus = BackorderQueueItem["status"] | "all";

const statusFilters: Array<{ label: string; value: BackorderStatus }> = [
	{ label: "All", value: "all" },
	{ label: "Awaiting Inbound", value: "awaiting_inbound" },
	{ label: "Backordered", value: "backordered" },
	{ label: "Ready To Ship", value: "ready_to_ship_remaining" },
];

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

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function InventoryBackorderQueuePage({ initialSettings }: Props) {
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
	const tableActions = useMemo(
		() => ({
			onShipAvailable: (item: BackorderQueueItem) => {
				if (!item.salesOrderId || !item.lineItemId) return;
				shipAvailable.mutate({
					salesOrderId: item.salesOrderId,
					lineItemIds: [item.lineItemId],
					note: "Partial shipment from backorder queue.",
				});
			},
			isShipping: shipAvailable.isPending,
		}),
		[shipAvailable.isPending, shipAvailable.mutate],
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
					<InventoryBackordersColumnVisibility />
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
						{formatQty(summary?.inboundQty)} / {formatQty(summary?.receivedQty)}
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

			<DataTable
				data={items}
				initialSettings={initialSettings}
				isLoading={queueQuery.isLoading}
				actions={tableActions}
			/>
		</div>
	);
}
