export type ProductionAvailabilityNeed = {
	id: string;
	componentIds: number[];
	name: string;
	description: string;
	qtyPending: number;
	qtyAvailableToMark: number;
};

export function summarizeProductionAvailability(input: {
	needs: ProductionAvailabilityNeed[];
	inboundCount: number;
	pendingInboundCount: number;
	open: boolean;
	setupReady: boolean;
	canMarkAvailable: boolean;
	workerMode: boolean;
}) {
	const needs = input.needs.filter((need) => need.qtyPending > 0.000001);
	const pendingQty = needs.reduce((sum, need) => sum + need.qtyPending, 0);
	const markableQty = needs.reduce(
		(sum, need) => sum + need.qtyAvailableToMark,
		0,
	);
	const state = !input.open
		? "readonly"
		: !input.setupReady
			? "unknown"
			: input.pendingInboundCount > 0
				? "pending_inbound"
				: !needs.length
					? "covered"
					: markableQty <= 0.000001
						? "review"
						: input.inboundCount === 0
							? "missing_inbound"
							: "remaining_needs";
	return {
		state,
		itemCount: needs.length,
		pendingQty,
		markableQty,
		canMarkAvailable:
			input.canMarkAvailable &&
			input.open &&
			input.setupReady &&
			markableQty > 0.000001,
		workerMode: input.workerMode,
	};
}
