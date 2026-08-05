import { useEffect, useMemo, useState } from "react";
import type { InventoryFulfillmentItem } from "../lib/inventory-fulfillment-model";
import { getInventoryShipmentSelection } from "../lib/inventory-fulfillment-policy";

export function useInventoryFulfillmentSelection(
	items: InventoryFulfillmentItem[],
) {
	const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
	const [shipmentItems, setShipmentItems] = useState<
		InventoryFulfillmentItem[]
	>([]);
	const selectedItems = useMemo(
		() => items.filter((item) => selectedKeys.has(item.key)),
		[items, selectedKeys],
	);
	const shipmentSelection = getInventoryShipmentSelection(selectedItems);

	useEffect(() => {
		const loadedKeys = new Set(items.map((item) => item.key));
		setSelectedKeys((current) => {
			const next = new Set([...current].filter((key) => loadedKeys.has(key)));
			return next.size === current.size ? current : next;
		});
	}, [items]);

	return {
		selectedItems,
		shipmentItems,
		shipmentSelection,
		setShipmentItems,
		clearSelection: () => setSelectedKeys(new Set()),
		isSelected: (key: string) => selectedKeys.has(key),
		toggleSelected(key: string) {
			setSelectedKeys((current) => {
				const next = new Set(current);
				next.has(key) ? next.delete(key) : next.add(key);
				return next;
			});
		},
	};
}
