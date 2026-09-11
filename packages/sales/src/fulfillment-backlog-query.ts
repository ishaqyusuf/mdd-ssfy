import type { Database, Prisma, TransactionClient } from "@gnd/db";
import { buildFulfillmentQuantityOverview } from "./sales-control/fulfillment-quantity-overview";

export const fulfillmentBacklogEvidenceSelect = {
	id: true,
	itemControls: {
		where: { deletedAt: null },
		select: {
			uid: true,
			orderItemId: true,
			title: true,
			shippable: true,
			qtyControls: {
				where: { deletedAt: null, type: "qty" },
				select: { qty: true, lh: true, rh: true, total: true },
			},
		},
	},
	completionRecords: {
		where: { state: "ACTIVE", milestone: "FULFILLMENT_COMPLETED" },
		select: { id: true, completionMethod: true },
	},
	deliveries: {
		where: { deletedAt: null },
		select: {
			id: true,
			status: true,
			deliveryMode: true,
			meta: true,
			_count: {
				select: {
					stockAllocations: {
						where: { deletedAt: null, status: { not: "cancelled" } },
					},
				},
			},
			items: {
				where: { deletedAt: null },
				select: {
					orderDeliveryId: true,
					orderItemId: true,
					packingStatus: true,
					qty: true,
					lhQty: true,
					rhQty: true,
					submission: {
						select: { assignment: { select: { salesItemControlUid: true } } },
					},
				},
			},
		},
	},
} satisfies Prisma.SalesOrdersSelect;
type Evidence = Prisma.SalesOrdersGetPayload<{
	select: typeof fulfillmentBacklogEvidenceSelect;
}>;

export function projectBacklogEvidence(
	order: Evidence,
	options?: { excludeDeliveryId?: number },
) {
	const missingControls =
		order.itemControls.length === 0 ||
		order.itemControls.some(
			(item) =>
				item.shippable !== false &&
				(!item.orderItemId || item.qtyControls.length !== 1),
		);
	let projection = buildFulfillmentQuantityOverview({
		excludeDeliveryId: options?.excludeDeliveryId,
		items: order.itemControls.map((item) => {
			const qty = item.qtyControls[0];
			return {
				controlUid: item.uid,
				itemId: item.orderItemId ?? 0,
				title: item.title,
				qty: { qty: qty?.total ?? 0, lh: qty?.lh ?? 0, rh: qty?.rh ?? 0 },
				itemConfig: { shipping: item.shippable },
			};
		}),
		headers: order.deliveries,
		packing: order.deliveries.flatMap((delivery) => delivery.items),
	});
	if (missingControls) {
		projection = {
			...projection,
			resolved: false,
			backlogQty: 0,
			conflicts: [
				...projection.conflicts,
				{ code: "INCOMPLETE_ORDER_QUANTITY_EVIDENCE" },
			],
			lines: projection.lines.map((line) => ({
				...line,
				availableToAssign: { qty: 0, lh: 0, rh: 0 },
			})),
		};
	}
	// Status-only administrative completion remains distinct from physical totals.
	const administrativelyCompleted = order.completionRecords.some(
		(record) => record.completionMethod === "STATUS_ONLY",
	);
	return {
		projection,
		isBacklog:
			!missingControls &&
			!administrativelyCompleted &&
			projection.resolved &&
			projection.backlogQty > 0,
	};
}

/** Bounded evidence reads; no per-order overview/settings queries or full collection hydration. */
export async function getFulfillmentBacklogOrderIds(
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
		for (const order of orders)
			if (projectBacklogEvidence(order).isBacklog) ids.push(order.id);
		if (orders.length < 100) return ids;
		afterId = orders[orders.length - 1]!.id;
	}
}
