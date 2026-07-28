export type DispatchSalesSelectionRow = {
	status?: string | null;
	order?: {
		id?: number | null;
		orderId?: string | null;
	} | null;
};

const PENDING_DISPATCH_STATUSES = new Set([
	"in progress",
	"missing items",
	"packed",
	"queue",
	"packing queue",
]);

export function isPendingDispatchStatus(status?: string | null) {
	return PENDING_DISPATCH_STATUSES.has(status?.trim().toLowerCase() || "");
}

export function getDispatchSalesSelection(
	dispatches: readonly DispatchSalesSelectionRow[],
) {
	const salesById = new Map<
		number,
		{
			orderNo: string;
			salesId: number;
			salesType: "order";
		}
	>();

	for (const dispatch of dispatches) {
		if (!isPendingDispatchStatus(dispatch.status)) continue;

		const salesId = dispatch.order?.id;
		const orderNo = dispatch.order?.orderId;

		if (!salesId || !orderNo || salesById.has(salesId)) continue;

		salesById.set(salesId, {
			orderNo,
			salesId,
			salesType: "order",
		});
	}

	const salesRefs = [...salesById.values()];

	return {
		salesIds: salesRefs.map((sale) => sale.salesId),
		salesRefs,
	};
}
