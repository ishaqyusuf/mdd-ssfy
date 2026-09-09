"use client";

import { ProductionPendingInbounds } from "../production/v2/production-pending-inbounds";
import { ProductionMaterialAvailability } from "./production-material-availability";

/** Mount only in the active Production tab or an explicitly expanded calendar card. */
export function ProductionMaterialActions({
	salesOrderId,
	onOpenForm,
	onOpenInventory,
}: {
	salesOrderId: number;
	onOpenForm?: () => void;
	onOpenInventory?: (inboundId?: number) => void;
}) {
	return (
		<div className="space-y-3">
			<ProductionPendingInbounds
				key={salesOrderId}
				salesOrderId={salesOrderId}
				onOpenInventory={onOpenInventory}
			/>
			<ProductionMaterialAvailability
				salesOrderId={salesOrderId}
				onOpenForm={onOpenForm}
				onOpenInventory={onOpenInventory}
			/>
		</div>
	);
}
