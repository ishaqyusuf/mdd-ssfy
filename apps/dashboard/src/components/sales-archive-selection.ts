export type SalesArchiveCandidate = {
	salesId: number;
	orderNo: string;
	archived: boolean;
};

export function getSalesArchiveCandidates(
	orders: readonly {
		salesId: number;
		orderNo: string;
		archivedAt?: Date | string | null;
		pipeline?: { evidence?: unknown } | null;
	}[],
): SalesArchiveCandidate[] {
	return orders.flatMap((order) => {
		if (order.archivedAt !== undefined) {
			return [
				{
					salesId: order.salesId,
					orderNo: order.orderNo,
					archived: order.archivedAt !== null,
				},
			];
		}
		const evidence = order.pipeline?.evidence;
		if (
			!evidence ||
			typeof evidence !== "object" ||
			!("commercial" in evidence)
		)
			return [];
		const commercial = evidence.commercial;
		if (
			!commercial ||
			typeof commercial !== "object" ||
			!("archivedAt" in commercial)
		)
			return [];
		return [
			{
				salesId: order.salesId,
				orderNo: order.orderNo,
				archived: Boolean(commercial.archivedAt),
			},
		];
	});
}
