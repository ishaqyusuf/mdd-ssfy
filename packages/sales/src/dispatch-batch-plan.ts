export type DispatchBatchPlanOrder = {
	salesId: number;
	dueDate: Date;
};

export type ResolvedDispatchBatchPlanOrder = DispatchBatchPlanOrder & {
	individualDueDate: Date;
	overrideApplied: boolean;
};

function copyValidDate(value: Date, field: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`${field} must be a valid date.`);
	}
	return date;
}

export function resolveDispatchBatchDueDates(input: {
	orders: DispatchBatchPlanOrder[];
	overrideDueDate?: Date | null;
}): ResolvedDispatchBatchPlanOrder[] {
	if (!input.orders.length) {
		throw new Error("Select at least one order for this dispatch batch.");
	}

	const overrideDueDate = input.overrideDueDate
		? copyValidDate(input.overrideDueDate, "Override delivery date")
		: null;
	const salesIds = new Set<number>();

	return input.orders.map((order) => {
		if (salesIds.has(order.salesId)) {
			throw new Error(`Order ${order.salesId} is selected more than once.`);
		}
		salesIds.add(order.salesId);

		const individualDueDate = copyValidDate(
			order.dueDate,
			`Delivery date for order ${order.salesId}`,
		);

		return {
			salesId: order.salesId,
			individualDueDate,
			dueDate: overrideDueDate
				? new Date(overrideDueDate)
				: new Date(individualDueDate),
			overrideApplied: Boolean(overrideDueDate),
		};
	});
}
