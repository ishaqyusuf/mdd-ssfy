"use client";

import { InventoryPartialShipmentsColumnVisibility } from "@/components/tables-2/inventory-partial-shipments/column-visibility";
import { DataTable } from "@/components/tables-2/inventory-partial-shipments/data-table";
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

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function InventoryPartialShipmentPage({ initialSettings }: Props) {
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
					<div className="text-xs uppercase text-muted-foreground">Inbound</div>
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
				<div className="ml-auto">
					<InventoryPartialShipmentsColumnVisibility />
				</div>
			</div>

			<DataTable
				data={items}
				initialSettings={initialSettings}
				isLoading={queueQuery.isLoading}
				actions={{
					onToggleHold: (item, holdUntilComplete) => {
						if (!item.lineItemId) return;
						setHold.mutate({
							lineItemId: item.lineItemId,
							holdUntilComplete,
							note: holdUntilComplete
								? "Held from partial shipment screen."
								: "Partial shipment allowed from partial shipment screen.",
						});
					},
					onShipAvailable: (item) => {
						if (!item.salesOrderId || !item.lineItemId) return;
						shipAvailable.mutate({
							salesOrderId: item.salesOrderId,
							lineItemIds: [item.lineItemId],
							note: "Partial shipment from partial shipment screen.",
						});
					},
					isHolding: setHold.isPending,
					isShipping: shipAvailable.isPending,
				}}
			/>
		</div>
	);
}
