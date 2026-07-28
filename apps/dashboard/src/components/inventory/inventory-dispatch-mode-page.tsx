"use client";

import { InventoryDispatchModeColumnVisibility } from "@/components/tables-2/inventory-dispatch-mode/column-visibility";
import { DataTable } from "@/components/tables-2/inventory-dispatch-mode/data-table";
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

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function InventoryDispatchModePage({ initialSettings }: Props) {
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
		assign.isPending ||
		pack.isPending ||
		fulfill.isPending ||
		release.isPending;
	const tableActions = useMemo(
		() => ({
			onAssignLine: (item: DispatchQueueItem) => {
				assign.mutate({
					...getLineInput(item),
					note: "Assigned from inventory dispatch mode.",
				});
			},
			onPackLine: (item: DispatchQueueItem) => {
				pack.mutate({
					...getLineInput(item),
					note: "Packed from inventory dispatch mode.",
				});
			},
			onFulfillLine: (item: DispatchQueueItem) => {
				fulfill.mutate({
					...getLineInput(item),
					deliveryMode: "inventory_dispatch",
					note: "Fulfilled from inventory dispatch mode.",
				});
			},
			onReleaseLine: (item: DispatchQueueItem) => {
				release.mutate({
					...getLineInput(item),
					note: "Released from inventory dispatch mode.",
				});
			},
			onAssignAllocation: (item: DispatchQueueItem, allocationId: number) => {
				assign.mutate({
					...getAllocationInput(item, allocationId),
					note: "Assigned from inventory dispatch mode.",
				});
			},
			onPackAllocation: (item: DispatchQueueItem, allocationId: number) => {
				pack.mutate({
					...getAllocationInput(item, allocationId),
					note: "Packed from inventory dispatch mode.",
				});
			},
			onFulfillAllocation: (item: DispatchQueueItem, allocationId: number) => {
				fulfill.mutate({
					...getAllocationInput(item, allocationId),
					deliveryMode: "inventory_dispatch",
					note: "Fulfilled from inventory dispatch mode.",
				});
			},
			onReleaseAllocation: (item: DispatchQueueItem, allocationId: number) => {
				release.mutate({
					...getAllocationInput(item, allocationId),
					note: "Released from inventory dispatch mode.",
				});
			},
			isMutating,
		}),
		[assign.mutate, fulfill.mutate, isMutating, pack.mutate, release.mutate],
	);

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
					<InventoryDispatchModeColumnVisibility />
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
				<MetricCard
					label="Remaining"
					value={formatQty(summary?.remainingQty)}
				/>
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

			<DataTable
				data={items}
				initialSettings={initialSettings}
				isLoading={queueQuery.isLoading}
				actions={tableActions}
			/>
		</div>
	);
}
