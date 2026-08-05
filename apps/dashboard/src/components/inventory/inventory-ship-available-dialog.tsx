"use client";

import { useInventoryFulfillmentInvalidation } from "@/hooks/use-inventory-fulfillment-invalidation";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useMutation } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";
import { z } from "zod";

const shipmentSchema = z.object({
	deliveryMode: z.enum(["pickup", "delivery", "ship"]),
	deliveredTo: z.string().trim().max(500).nullable(),
	note: z.string().trim().max(2_000).nullable(),
});

export type InventoryShipAvailableLine = {
	salesOrderId?: number | null;
	lineItemId?: number | null;
	lineItemIds?: number[];
	orderId?: string | null;
	title?: string | null;
	deliveryMode?: "pickup" | "delivery" | "ship" | null;
	availableToShipQty?: number;
	remainingQty?: number;
	backorderedQty?: number;
};

type Props = {
	item: InventoryShipAvailableLine | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function InventoryShipAvailableDialog({
	item,
	open,
	onOpenChange,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{item ? (
				<InventoryShipAvailableForm
					key={`${item.salesOrderId}-${item.lineItemId}`}
					item={item}
					onComplete={() => onOpenChange(false)}
				/>
			) : null}
		</Dialog>
	);
}

function InventoryShipAvailableForm({
	item,
	onComplete,
}: {
	item: InventoryShipAvailableLine;
	onComplete: () => void;
}) {
	const trpc = useTRPC();
	const invalidate = useInventoryFulfillmentInvalidation();
	const [deliveryMode, setDeliveryMode] = useState(item.deliveryMode ?? "");
	const [deliveredTo, setDeliveredTo] = useState("");
	const [note, setNote] = useState("Partial inventory shipment.");
	const mutation = useMutation(
		trpc.inventories.shipAvailableSalesInventory.mutationOptions({
			async onSuccess(data) {
				await invalidate();
				toast({
					title: data.ok ? "Available quantity shipped" : "Nothing shipped",
					description: `${data.shippedQty} shipped, ${data.backorderedQty} remaining.`,
					...(data.ok ? { variant: "success" as const } : {}),
				});
				onComplete();
			},
			onError(error) {
				toast({
					title: "Shipment could not be completed",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	function submit() {
		if (!item.salesOrderId || !item.lineItemId) return;
		const parsed = shipmentSchema.safeParse({
			deliveryMode,
			deliveredTo: deliveredTo || null,
			note: note || null,
		});
		if (!parsed.success) {
			toast({
				title: "Choose a delivery mode",
				description: "Select pickup, delivery, or ship before continuing.",
				variant: "destructive",
			});
			return;
		}
		mutation.mutate({
			salesOrderId: item.salesOrderId,
			lineItemIds: item.lineItemIds ?? [item.lineItemId],
			...parsed.data,
		});
	}

	return (
		<DialogContent className="sm:max-w-lg">
			<DialogHeader>
				<DialogTitle>Ship available inventory</DialogTitle>
				<DialogDescription>
					Order {item.orderId || item.salesOrderId}:{" "}
					{item.title || "Inventory line"}
				</DialogDescription>
			</DialogHeader>
			<div className="grid gap-4 py-2">
				<div className="grid grid-cols-3 gap-3 rounded-md border p-3 text-sm">
					<Quantity label="Available" value={item.availableToShipQty ?? 0} />
					<Quantity label="Remaining" value={item.remainingQty ?? 0} />
					<Quantity label="Backorder" value={item.backorderedQty ?? 0} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="inventory-delivery-mode">Delivery mode</Label>
					<Select value={deliveryMode} onValueChange={setDeliveryMode}>
						<SelectTrigger id="inventory-delivery-mode">
							<SelectValue placeholder="Select a delivery mode" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="pickup">Pickup</SelectItem>
							<SelectItem value="delivery">Delivery</SelectItem>
							<SelectItem value="ship">Ship</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="inventory-delivered-to">Delivered to</Label>
					<Input
						id="inventory-delivered-to"
						value={deliveredTo}
						onChange={(event) => setDeliveredTo(event.target.value)}
						placeholder="Customer, carrier, or pickup contact"
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="inventory-shipment-note">Note</Label>
					<Textarea
						id="inventory-shipment-note"
						value={note}
						onChange={(event) => setNote(event.target.value)}
						rows={3}
					/>
				</div>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onComplete}>
					Cancel
				</Button>
				<Button type="button" disabled={mutation.isPending} onClick={submit}>
					{mutation.isPending ? "Shipping..." : "Confirm shipment"}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}

function Quantity({ label, value }: { label: string; value: number }) {
	return (
		<div>
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="font-mono font-semibold">{value}</div>
		</div>
	);
}
