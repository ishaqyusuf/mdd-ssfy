"use client";

import type { FilterDefinition } from "@/components/midday-search-filter/filter-definitions";
import { SearchFilterTRPC } from "@/components/midday-search-filter/search-filter-trpc";
import { InventoryBackordersColumnVisibility } from "@/components/tables-2/inventory-backorders/column-visibility";
import { useAuth } from "@/hooks/use-auth";
import {
	inventoryBackorderFilterParamsSchema,
	useInventoryBackorderFilterParams,
} from "@/hooks/use-inventory-backorder-filter-params";
import { useInventoryFulfillmentInvalidation } from "@/hooks/use-inventory-fulfillment-invalidation";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { buildSalesInventoryPrintViewerUrl } from "@/modules/sales-print/application/inventory-print-request";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import {
	getDeliveryFilterOptionColor,
	getStatusFilterOptionColor,
} from "@gnd/utils/filter-option-colors";
import Link from "next/link";
import { useState } from "react";

const definitions = [
	{ key: "q", label: "Search", type: "search" },
	{
		key: "statuses",
		label: "Status",
		type: "multi-select",
		options: [
			{ label: "Awaiting inbound", value: "awaiting_inbound" },
			{ label: "Backordered", value: "backordered" },
			{ label: "Ready remaining", value: "ready_to_ship_remaining" },
		].map((option) => ({
			...option,
			color: getStatusFilterOptionColor(option.value),
		})),
	},
	{
		key: "deliveryModes",
		label: "Delivery mode",
		type: "multi-select",
		options: [
			{ label: "Pickup", value: "pickup" },
			{ label: "Delivery", value: "delivery" },
			{ label: "Ship", value: "ship" },
		].map((option) => ({
			...option,
			color: getDeliveryFilterOptionColor(option.value),
		})),
	},
	{
		key: "holdUntilComplete",
		label: "Hold",
		type: "single-select",
		options: [
			{ label: "Held until complete", value: "true" },
			{ label: "Partial shipment allowed", value: "false" },
		].map((option) => ({
			...option,
			color: getStatusFilterOptionColor(option.label),
		})),
	},
] satisfies FilterDefinition[];

export function InventoryBackordersHeader() {
	return (
		<SearchFilterProvider
			args={[{ filterSchema: inventoryBackorderFilterParamsSchema }]}
		>
			<InventoryBackordersHeaderContent />
		</SearchFilterProvider>
	);
}

function InventoryBackordersHeaderContent() {
	const trpc = useTRPC();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const invalidateInventoryFulfillment = useInventoryFulfillmentInvalidation();
	const { shouldFetch } = useSearchFilterContext();
	const { filters } = useInventoryBackorderFilterParams();
	const [isPrinting, setIsPrinting] = useState(false);
	const canAllocate = Boolean(
		auth.can?.editInboundOrder || auth.can?.editOrders,
	);

	const allocateReceived = useMutation(
		trpc.inventories.allocateReceivedInboundToBackorders.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.ok ? "Backorders released" : "No stock allocated",
					description: `${data.allocatedQty} received units reserved across ${data.touchedComponentCount} components.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				void invalidateInventoryFulfillment();
			},
		}),
	);

	async function printFilteredBackorders() {
		setIsPrinting(true);
		try {
			const result = await queryClient.fetchQuery(
				trpc.inventories.salesBackorderQueuePrintSelection.queryOptions(
					filters,
				),
			);
			if (result.salesOrderIds.length === 0) return;
			window.open(
				buildSalesInventoryPrintViewerUrl({
					salesIds: result.salesOrderIds,
					mode: "packing-slip",
				}),
				"_blank",
				"noopener,noreferrer",
			);
		} finally {
			setIsPrinting(false);
		}
	}

	return (
		<div className="space-y-3">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">
					Inventory Backorders
				</h1>
				<p className="text-sm text-muted-foreground">
					Track shortages, received stock, and remaining customer fulfillment.
				</p>
			</div>
			<SearchFilterTRPC
				placeholder="Search order, customer, line, UID, or SKU..."
				filterList={definitions}
				loading={shouldFetch && auth.isPending}
				pageTabs={null}
				toolbarActions={
					<>
						<InventoryBackordersColumnVisibility />
						<Button asChild type="button" size="sm" variant="outline">
							<Link href="/inventory/partial-shipments">
								<Icons.Truck className="mr-2 size-4" />
								Partial Shipments
							</Link>
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={isPrinting}
							onClick={() => void printFilteredBackorders()}
						>
							<Icons.FileText className="mr-2 size-4" />
							Print Filtered
						</Button>
						{canAllocate ? (
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={allocateReceived.isPending}
								onClick={() =>
									allocateReceived.mutate({
										limit: 200,
										note: "Manual backorder queue release.",
									})
								}
							>
								<Icons.RefreshCw className="mr-2 size-4" />
								Allocate Received
							</Button>
						) : null}
					</>
				}
			/>
		</div>
	);
}
