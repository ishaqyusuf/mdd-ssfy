"use client";

import { useRef, useState } from "react";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { ProductionMaterialActions } from "@/components/sheets/sales-overview-sheet/availability/production-material-actions";
import { InboundCreatePane } from "@/components/sheets/sales-overview-sheet/inbound-create-pane";

/** Loaded only after the user expands a calendar card's material details. */
export function CalendarMaterialActions({
	salesOrderId,
	orderNo,
}: { salesOrderId: number; orderNo: string }) {
	const [formOpen, setFormOpen] = useState(false);
	const trigger = useRef<HTMLElement | null>(null);
	const { setParams } = useSalesOverviewQuery();
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	function closeForm() {
		setFormOpen(false);
		requestAnimationFrame(() => trigger.current?.focus());
	}
	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
			<div hidden={formOpen} className="min-h-0 overflow-y-auto overscroll-contain">
				<ProductionMaterialActions
					salesOrderId={salesOrderId}
					onOpenForm={() => {
						trigger.current =
							document.activeElement instanceof HTMLElement
								? document.activeElement
								: null;
						setFormOpen(true);
					}}
					onOpenInventory={(inboundId) => {
						setInventorySegment(
							inboundId ? "inbounds" : "stock",
							inboundId ? { inboundId } : undefined,
						);
						setParams({
							"sales-overview-id": orderNo,
							"sales-type": "order",
							mode: "sales-production",
							salesTab: "inventory",
							"prod-item-view": null,
						});
					}}
				/>
			</div>
			{formOpen && (
				<InboundCreatePane
					salesOrderId={salesOrderId}
					orderNumber={orderNo}
					mode="mark_available"
					presentation="inline"
					onClose={closeForm}
					onCreated={closeForm}
				/>
			)}
		</div>
	);
}
