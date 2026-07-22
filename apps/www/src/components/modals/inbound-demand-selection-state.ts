import { canOrderInboundPromptMutateDemand } from "@gnd/inventory/inbound-policy";

export type PromptSelectableInboundDemand = {
	id: number;
	status: string | null;
	qtyReceived: number | null | undefined;
	inboundShipmentItemId: number | null;
};

export function isPromptMutableDemand(
	demand: PromptSelectableInboundDemand,
	status: string | null | undefined,
) {
	return canOrderInboundPromptMutateDemand({
		orderInventoryStatus: status,
		demandStatus: demand.status,
		qtyReceived: demand.qtyReceived,
		inboundShipmentItemId: demand.inboundShipmentItemId,
	});
}

export function getPromptMutableDemandIds(
	rows: PromptSelectableInboundDemand[],
	status: string | null | undefined,
) {
	return rows
		.filter((demand) => isPromptMutableDemand(demand, status))
		.map((demand) => demand.id);
}
