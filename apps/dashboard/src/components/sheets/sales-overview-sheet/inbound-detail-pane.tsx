"use client";

import { InboundOverviewContent } from "@/components/sheets/inbound-overview-content";
import Sheet from "@gnd/ui/custom/sheet";

export function InboundDetailPane({ inboundId }: { inboundId: number }) {
	return (
		<Sheet.SecondaryContent
			className="px-1"
			Header={
				<Sheet.SecondaryHeader
					title={`Inbound #${inboundId}`}
					description="Shipment details, lifecycle controls, linked demand, and activity."
				/>
			}
		>
			<InboundOverviewContent inboundId={inboundId} />
		</Sheet.SecondaryContent>
	);
}
