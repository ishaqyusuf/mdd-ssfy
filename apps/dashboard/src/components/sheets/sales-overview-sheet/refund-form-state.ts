export function syncSingleOrderPrincipalAllocation(input: {
	allocations: Record<number, string>;
	eligibleOrderIds: number[];
	principal: string;
	salesOrderId: number;
}) {
	const orderIds = input.eligibleOrderIds.length
		? input.eligibleOrderIds
		: [input.salesOrderId];

	if (orderIds.length !== 1) return input.allocations;

	return { [orderIds[0]]: input.principal };
}
