import type { Db } from "@gnd/db";

export async function deleteSalesOrdersByOrderIds(
	db: Pick<Db, "salesOrders">,
	orderIds: string[],
) {
	const affected = await db.salesOrders.findMany({
		where: { orderId: { in: orderIds } },
		select: { id: true },
	});
	const affectedSalesIds = affected.map((order) => order.id);
	if (!affectedSalesIds.length)
		return { count: 0, affectedSalesIds, deletedSalesIds: [] as number[] };
	const result = await db.salesOrders.updateMany({
		where: { id: { in: affectedSalesIds } },
		data: { deletedAt: new Date() },
	});
	return {
		count: result.count,
		affectedSalesIds,
		// A count identifies every row only when the write is bounded to this set
		// and all of it committed. Partial counts must not fabricate identities.
		deletedSalesIds:
			result.count === affectedSalesIds.length ? affectedSalesIds : [],
	};
}
