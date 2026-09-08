export function canReceiveProductionInboundItem(input: {
	workerEnabled: boolean;
	canEditInbound: boolean;
	hasIssues: boolean;
	salesOrderId: number;
	demands: Array<{
		saleId: number | null;
		salesItemId: number | null;
		variantUid: string | null;
	}>;
	assignments: Array<{
		itemId: number;
		dimension: string | null;
		wholeItem?: boolean;
	}>;
}) {
	if (input.hasIssues || !input.demands.length) return false;
	if (!input.canEditInbound && !input.workerEnabled) return false;
	return input.demands.every((demand) => {
		if (demand.saleId !== input.salesOrderId) return false;
		if (input.canEditInbound) return true;
		return input.assignments.some((assignment) => {
			if (assignment.itemId !== demand.salesItemId) return false;
			if (!assignment.dimension) return assignment.wholeItem === true;
			const match = assignment.dimension
				.trim()
				.match(/^(\d+-\d+)\s*x\s*(\d+-\d+)$/i);
			if (!match?.[1] || !match[2]) return false;
			return (
				demand.variantUid ===
				`w${match[1].replaceAll("-", "_")}-h${match[2].replaceAll("-", "_")}`
			);
		});
	});
}
