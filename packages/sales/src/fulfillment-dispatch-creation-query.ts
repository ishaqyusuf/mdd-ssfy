import type { Database, Prisma, TransactionClient } from "@gnd/db";
import {
	fulfillmentBacklogEvidenceSelect,
	projectBacklogEvidence,
} from "./fulfillment-backlog-query";

type Evidence = Prisma.SalesOrdersGetPayload<{
	select: typeof fulfillmentBacklogEvidenceSelect;
}>;

/** Creation requires one resolved, shippable unit and no active dispatch. */
export function projectDispatchCreationEvidence(order: Evidence) {
	const { projection } = projectBacklogEvidence(order);
	return (
		projection.resolved &&
		!order.completionRecords.some(
			(record) => record.completionMethod === "STATUS_ONLY",
		) &&
		order.deliveries.every((delivery) => delivery.status === "cancelled") &&
		projection.lines.some((line) =>
			Object.values(line.availableToAssign).some((quantity) => quantity > 0),
		)
	);
}

/** Bounded evidence reads; final create mutation must recheck inside its transaction. */
export async function getFulfillmentDispatchCreationOrderIds(
	db: Database | TransactionClient,
	where: Prisma.SalesOrdersWhereInput,
) {
	const ids: number[] = [];
	let afterId = 0;
	for (;;) {
		const orders = await db.salesOrders.findMany({
			where: { AND: [where, { id: { gt: afterId } }] },
			orderBy: { id: "asc" },
			take: 100,
			select: fulfillmentBacklogEvidenceSelect,
		});
		for (const order of orders) {
			if (projectDispatchCreationEvidence(order)) ids.push(order.id);
		}
		if (orders.length < 100) return ids;
		const last = orders.at(-1);
		if (!last) return ids;
		afterId = last.id;
	}
}
