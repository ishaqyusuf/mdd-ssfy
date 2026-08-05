"use client";

import { Button } from "@gnd/ui/button";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { InventoryPartialShipmentRow } from "./columns";
import { getInventoryPartialShipmentRowId } from "./columns";
import { useInventoryPartialShipmentsTableStore } from "./store";

type Props = {
	data: InventoryPartialShipmentRow[];
	canManageFulfillment: boolean;
	isHolding: boolean;
	onSetHold: (items: InventoryPartialShipmentRow[], hold: boolean) => void;
	onShip: (items: InventoryPartialShipmentRow[]) => void;
};

export function BottomBar({
	data,
	canManageFulfillment,
	isHolding,
	onSetHold,
	onShip,
}: Props) {
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } =
		useInventoryPartialShipmentsTableStore();
	const selectedRows = useMemo(
		() =>
			data.filter(
				(item) => rowSelection[getInventoryPartialShipmentRowId(item)],
			),
		[data, rowSelection],
	);
	const selectedSalesOrderIds = new Set(
		selectedRows.map((item) => item.salesOrderId).filter(Boolean),
	);
	const canShipSelection =
		selectedRows.length > 0 &&
		selectedSalesOrderIds.size === 1 &&
		selectedRows.every((item) => item.canShipNow && item.lineItemId);

	useEffect(() => setMounted(true), []);
	if (!mounted || selectedRows.length === 0) return null;

	return createPortal(
		<motion.div
			className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
			initial={{ y: 100 }}
			animate={{ y: 0 }}
		>
			<div className="pointer-events-auto flex h-12 min-w-[560px] items-center gap-2 rounded-md border bg-background/90 px-3 shadow-lg backdrop-blur">
				<span className="mr-auto text-sm">{selectedRows.length} selected</span>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!canManageFulfillment || isHolding}
					onClick={() => onSetHold(selectedRows, true)}
				>
					Hold selected
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!canManageFulfillment || isHolding}
					onClick={() => onSetHold(selectedRows, false)}
				>
					Allow partial
				</Button>
				<Button
					type="button"
					size="sm"
					disabled={!canManageFulfillment || !canShipSelection}
					title={
						canShipSelection
							? undefined
							: "Selected shippable lines must belong to one sale"
					}
					onClick={() => onShip(selectedRows)}
				>
					Ship selected
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => setRowSelection({})}
				>
					Deselect
				</Button>
			</div>
		</motion.div>,
		document.body,
	);
}
