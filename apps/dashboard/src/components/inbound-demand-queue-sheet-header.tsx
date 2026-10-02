"use client";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
export function InboundDemandQueueSheetHeader() {
	return (
		<SheetHeader>
			<SheetTitle>Inbound demand queue</SheetTitle>
			<SheetDescription>
				Assign shortages and review receiving and reorder needs.
			</SheetDescription>
		</SheetHeader>
	);
}
