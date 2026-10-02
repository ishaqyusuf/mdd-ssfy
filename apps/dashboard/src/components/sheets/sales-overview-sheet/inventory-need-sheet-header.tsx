"use client";

import Sheet from "@gnd/ui/custom/sheet-v2";

export function InventoryNeedSheetHeader({ inbound }: { inbound?: boolean }) {
	return (
		<Sheet.SecondaryHeader
			backLabel={inbound ? "Back to inventory need" : "Back to inventory"}
			title={inbound ? "Order shortage" : "Inventory need"}
			description={
				inbound
					? "Order only the pieces still missing."
					: "Stock and coverage for this selected item."
			}
		/>
	);
}
