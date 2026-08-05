import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { Toast } from "@/components/ui/toast";
import {
	type DeliveryOption,
	salesDeliveryOptionSchema,
} from "@gnd/utils/sales";
import { useEffect, useMemo, useState } from "react";
import type { InventoryFulfillmentItem } from "../lib/inventory-fulfillment-model";
import { InventoryShipmentForm } from "./inventory-shipment-form";

export function InventoryShipmentSheet({
	visible,
	items,
	isSubmitting,
	onClose,
	onSubmit,
}: {
	visible: boolean;
	items: InventoryFulfillmentItem[];
	isSubmitting: boolean;
	onClose: () => void;
	onSubmit: (input: {
		deliveryMode: DeliveryOption;
		deliveredTo: string | null;
		note: string | null;
	}) => Promise<unknown>;
}) {
	const [deliveryMode, setDeliveryMode] = useState<DeliveryOption | null>(null);
	const [deliveredTo, setDeliveredTo] = useState("");
	const [note, setNote] = useState("Partial inventory shipment.");
	const totals = useMemo(
		() =>
			items.reduce(
				(sum, item) => ({
					available: sum.available + item.availableToShipQty,
					remaining: sum.remaining + item.remainingQty,
					backorder: sum.backorder + item.backorderedQty,
				}),
				{ available: 0, remaining: 0, backorder: 0 },
			),
		[items],
	);

	useEffect(() => {
		if (!visible) return;
		const modes = new Set(
			items.map((item) => item.deliveryMode).filter(Boolean),
		);
		setDeliveryMode(modes.size === 1 ? (Array.from(modes)[0] ?? null) : null);
		setDeliveredTo("");
		setNote("Partial inventory shipment.");
	}, [items, visible]);

	async function submit() {
		const parsed = salesDeliveryOptionSchema.safeParse(deliveryMode);
		if (!parsed.success) {
			Toast.show("Choose pickup, delivery, or ship before continuing.", {
				type: "warning",
			});
			return;
		}
		try {
			await onSubmit({
				deliveryMode: parsed.data,
				deliveredTo: deliveredTo.trim() || null,
				note: note.trim() || null,
			});
			onClose();
		} catch {}
	}

	return (
		<FloatingBottomSheet
			visible={visible}
			onClose={onClose}
			accessibilityLabel="Ship available inventory"
		>
			<InventoryShipmentForm
				items={items}
				totals={totals}
				deliveryMode={deliveryMode}
				deliveredTo={deliveredTo}
				note={note}
				isSubmitting={isSubmitting}
				onDeliveryModeChange={setDeliveryMode}
				onDeliveredToChange={setDeliveredTo}
				onNoteChange={setNote}
				onCancel={onClose}
				onSubmit={submit}
			/>
		</FloatingBottomSheet>
	);
}
