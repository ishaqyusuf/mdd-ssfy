"use client";

import { InboundOverviewContent } from "@/components/sheets/inbound-overview-content";
import Sheet from "@gnd/ui/custom/sheet-v2";

export function InboundDetailPane({ inboundId, workerSalesOrderId }: { inboundId: number; workerSalesOrderId?: number }) {
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
			<InboundOverviewContent inboundId={inboundId} productionSalesOrderId={workerSalesOrderId} />
		</Sheet.SecondaryContent>
	);
}
