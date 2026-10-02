"use client";
import { InboundReceivingSheetHeader } from "@/components/inbound-receiving-sheet-header";
import { InboundReceivingContent } from "@/components/inventory/inbound-receiving-content";
import { useInboundReceiving } from "@/components/inventory/inbound-receiving-context";
import { Sheet, SheetContent } from "@gnd/ui/sheet";
export function InboundReceivingDetail() {
	const { selectedInboundId, setSelectedInboundId } = useInboundReceiving();
	return (
		<Sheet
			open={!!selectedInboundId}
			onOpenChange={(open) => {
				if (!open) setSelectedInboundId(null);
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
				<InboundReceivingSheetHeader inboundId={selectedInboundId} />
				{selectedInboundId ? (
					<InboundReceivingContent key={selectedInboundId} />
				) : null}
			</SheetContent>
		</Sheet>
	);
}
