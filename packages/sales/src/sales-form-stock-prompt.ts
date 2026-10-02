/** Prepare saved needs before reading stock; queued projection work may finish later. */
export async function prepareSalesFormStockPrompt<
	Plan extends {
		canApply: boolean;
		rows: Array<{ promptAvailableStock: boolean; applyQty: number }>;
	},
>(
	salesOrderId: number,
	handledSales: Set<number>,
	deps: {
		prepare: (salesOrderId: number) => Promise<unknown>;
		readPlan: (salesOrderId: number) => Promise<Plan>;
	},
) {
	if (handledSales.has(salesOrderId)) return null;
	await deps.prepare(salesOrderId);
	const plan = await deps.readPlan(salesOrderId);
	handledSales.add(salesOrderId);
	return plan.canApply &&
		plan.rows.some((row) => row.promptAvailableStock && row.applyQty > 0)
		? plan
		: null;
}
