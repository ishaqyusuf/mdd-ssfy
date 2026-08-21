"use client";

import type { FilterDefinition } from "@/components/midday-search-filter/filter-definitions";
import { SearchFilterTRPC } from "@/components/midday-search-filter/search-filter-trpc";
import { InventoryPartialShipmentsColumnVisibility } from "@/components/tables-2/inventory-partial-shipments/column-visibility";
import { inventoryPartialShipmentFilterParamsSchema } from "@/hooks/use-inventory-partial-shipment-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
	getDeliveryFilterOptionColor,
	getStatusFilterOptionColor,
} from "@gnd/utils/filter-option-colors";
import Link from "next/link";

const definitions = [
	{ key: "q", label: "Search", type: "search" },
	{
		key: "statuses",
		label: "Status",
		type: "multi-select",
		options: [
			{ label: "Available now", value: "available_now" },
			{ label: "Held", value: "held_until_complete" },
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

export function InventoryPartialShipmentsHeader() {
	return (
		<div className="space-y-3">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">
					Inventory Partial Shipments
				</h1>
				<p className="text-sm text-muted-foreground">
					Review shippable quantity, held lines, and remaining inventory
					blockers.
				</p>
			</div>
			<SearchFilterProvider
				args={[{ filterSchema: inventoryPartialShipmentFilterParamsSchema }]}
			>
				<SearchFilterTRPC
					placeholder="Search order, customer, line, UID, or SKU..."
					filterList={definitions}
					pageTabs={null}
					toolbarActions={
						<>
							<InventoryPartialShipmentsColumnVisibility />
							<Button asChild type="button" size="sm" variant="outline">
								<Link href="/inventory/backorders">
									<Icons.PackageOpen className="mr-2 size-4" />
									Backorders
								</Link>
							</Button>
						</>
					}
				/>
			</SearchFilterProvider>
		</div>
	);
}
