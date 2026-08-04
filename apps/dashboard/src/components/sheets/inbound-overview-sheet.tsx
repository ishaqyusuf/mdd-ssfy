"use client";

import { useInboundView } from "@/hooks/use-inbound-filter-params";
import Sheet from "@gnd/ui/custom/sheet";
import { InboundOverviewContent } from "./inbound-overview-content";

export function InboundOverviewSheet() {
	const { params, setParams } = useInboundView();
	const inboundId = params.viewInboundId;
	if (!inboundId) return null;

	return (
		<Sheet
			sheetName="inbound-overview"
			open
			floating
			rounded
			primarySize="3xl"
			onOpenChange={() => setParams(null)}
		>
			<Sheet.Header>
				<Sheet.Title>Inbound #{inboundId}</Sheet.Title>
				<Sheet.Description>
					Shipment details, lifecycle controls, linked demand, and activity.
				</Sheet.Description>
			</Sheet.Header>
			<Sheet.Content>
				<InboundOverviewContent inboundId={inboundId} />
			</Sheet.Content>
		</Sheet>
	);
}
