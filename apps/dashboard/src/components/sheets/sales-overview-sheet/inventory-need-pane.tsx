"use client";

import { InventoryNeedContent } from "@/components/inventory/sales-inventory/need-content";
import Sheet from "@gnd/ui/custom/sheet-v2";
import type { ComponentProps } from "react";
import { InventoryNeedSheetHeader } from "./inventory-need-sheet-header";

export function InventoryNeedPane(
	props: ComponentProps<typeof InventoryNeedContent>,
) {
	return (
		<Sheet.SecondaryContent
			Header={<InventoryNeedSheetHeader inbound={props.inbound} />}
		>
			<InventoryNeedContent {...props} />
		</Sheet.SecondaryContent>
	);
}
