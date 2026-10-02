"use client";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
export function InboundReceivingSheetHeader({
	inboundId,
}: { inboundId: number | null }) {
	return (
		<SheetHeader>
			<SheetTitle>Inbound #{inboundId}</SheetTitle>
			<SheetDescription>
				Documents, receipts, issues and activity for this shipment.
			</SheetDescription>
		</SheetHeader>
	);
}
