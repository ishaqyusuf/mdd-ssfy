"use client";
import { InboundDemandQueueSheetHeader } from "@/components/inbound-demand-queue-sheet-header";
import { useInboundReceiving } from "@/components/inventory/inbound-receiving-context";
import { InboundReceivingQueueContent } from "@/components/inventory/inbound-receiving-queue";
import { Sheet, SheetContent } from "@gnd/ui/sheet";
export function InboundReceivingQueue() {
	const {
		inboundQueue,
		setParams,
		setSelectedDemandIds,
		setSelectedSupplierId,
	} = useInboundReceiving();
	return (
		<Sheet
			open={inboundQueue === true}
			onOpenChange={(open) => {
				if (!open) {
					void setParams({ inboundQueue: null });
					setSelectedDemandIds([]);
					setSelectedSupplierId("");
				}
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<InboundDemandQueueSheetHeader />
				{inboundQueue ? <InboundReceivingQueueContent /> : null}
			</SheetContent>
		</Sheet>
	);
}
