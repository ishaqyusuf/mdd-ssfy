import { type Db, Prisma, type TransactionClient } from "@gnd/db";

import { applyInboundShipmentToNeeds } from "./inbound-demand";

type DbLike = Db | TransactionClient;

export type ReceivedInboundNeedsAttentionItem = {
	inboundId: number;
	status: string;
	createdAt: Date;
	receivedAt: Date | null;
	reference: string | null;
	linkedNeedCount: number;
	appliedQty: number;
	capacityQty: number;
};

type ReceivedInboundNeedsAttentionInput = {
	take?: number;
	salesOrderId?: number;
};

function receivedInboundNeedsAttentionQuery(
	input: Pick<ReceivedInboundNeedsAttentionInput, "salesOrderId"> = {},
) {
	const demandTotals = (salesOrderId?: number) => Prisma.sql`
		SELECT
			demand.inboundShipmentItemId,
			COUNT(*) AS linkedNeedCount,
			SUM(demand.qty) AS linkedQty,
			SUM(LEAST(demand.qty, demand.qtyReceived)) AS appliedQty
		FROM InboundDemand demand
		INNER JOIN LineItemComponents component
			ON component.id = demand.lineItemComponentId
		INNER JOIN LineItem lineItem
			ON lineItem.id = component.lineItemId AND lineItem.deletedAt IS NULL
		INNER JOIN SalesOrders sale
			ON sale.id = lineItem.saleId AND sale.deletedAt IS NULL
		WHERE demand.deletedAt IS NULL
			AND demand.status <> 'cancelled'
			${salesOrderId ? Prisma.sql`AND sale.id = ${salesOrderId}` : Prisma.sql``}
		GROUP BY demand.inboundShipmentItemId
	`;
	const allDemandTotals = demandTotals();
	if (input.salesOrderId) {
		const scopedDemandTotals = demandTotals(input.salesOrderId);
		return Prisma.sql`
			SELECT
				inbound.id AS inboundId,
				inbound.status,
				inbound.createdAt,
				inbound.receivedAt,
				inbound.reference,
				SUM(scopedDemandTotals.linkedNeedCount) AS linkedNeedCount,
				SUM(scopedDemandTotals.appliedQty) AS appliedQty,
				SUM(
					scopedDemandTotals.appliedQty + LEAST(
						GREATEST(
							0,
							LEAST(item.qty, allDemandTotals.linkedQty) - allDemandTotals.appliedQty
						),
						GREATEST(
							0,
							scopedDemandTotals.linkedQty - scopedDemandTotals.appliedQty
						)
					)
				) AS capacityQty
			FROM InboundShipment inbound
			INNER JOIN InboundShipmentItem item
				ON item.inboundId = inbound.id AND item.deletedAt IS NULL
			INNER JOIN (${allDemandTotals}) allDemandTotals
				ON allDemandTotals.inboundShipmentItemId = item.id
			INNER JOIN (${scopedDemandTotals}) scopedDemandTotals
				ON scopedDemandTotals.inboundShipmentItemId = item.id
			WHERE inbound.deletedAt IS NULL
				AND inbound.status = 'completed'
			GROUP BY
				inbound.id,
				inbound.status,
				inbound.createdAt,
				inbound.receivedAt,
				inbound.reference
			HAVING capacityQty > appliedQty
		`;
	}
	return Prisma.sql`
	SELECT
		inbound.id AS inboundId,
		inbound.status,
		inbound.createdAt,
		inbound.receivedAt,
		inbound.reference,
		SUM(demandTotals.linkedNeedCount) AS linkedNeedCount,
		SUM(LEAST(LEAST(item.qty, demandTotals.linkedQty), demandTotals.appliedQty)) AS appliedQty,
		SUM(LEAST(item.qty, demandTotals.linkedQty)) AS capacityQty
	FROM InboundShipment inbound
	INNER JOIN InboundShipmentItem item
		ON item.inboundId = inbound.id AND item.deletedAt IS NULL
	INNER JOIN (${allDemandTotals}) demandTotals
		ON demandTotals.inboundShipmentItemId = item.id
	WHERE inbound.deletedAt IS NULL
		AND inbound.status = 'completed'
	GROUP BY
		inbound.id,
		inbound.status,
		inbound.createdAt,
		inbound.receivedAt,
		inbound.reference
	HAVING capacityQty > appliedQty
`;
}

export async function listReceivedInboundNeedsAttention(
	db: DbLike,
	input: ReceivedInboundNeedsAttentionInput = {},
): Promise<ReceivedInboundNeedsAttentionItem[]> {
	type RawAttentionRow = Omit<
		ReceivedInboundNeedsAttentionItem,
		"linkedNeedCount" | "appliedQty" | "capacityQty"
	> & {
		linkedNeedCount: bigint | number;
		appliedQty: bigint | number;
		capacityQty: bigint | number;
	};
	const attentionQuery = receivedInboundNeedsAttentionQuery(input);
	const orderedAttentionQuery = Prisma.sql`
		SELECT attention.*
		FROM (${attentionQuery}) attention
		ORDER BY
			COALESCE(attention.receivedAt, attention.createdAt) DESC,
			attention.inboundId DESC
	`;
	const rows = input.take
		? await db.$queryRaw<RawAttentionRow[]>(
				Prisma.sql`${orderedAttentionQuery} LIMIT ${Math.min(100, Math.max(1, input.take))}`,
			)
		: await db.$queryRaw<RawAttentionRow[]>(orderedAttentionQuery);

	return rows.map((row) => ({
		...row,
		linkedNeedCount: Number(row.linkedNeedCount),
		appliedQty: Number(row.appliedQty),
		capacityQty: Number(row.capacityQty),
	}));
}

export async function countReceivedInboundNeedsAttention(db: DbLike) {
	const attentionQuery = receivedInboundNeedsAttentionQuery();
	const rows = await db.$queryRaw<Array<{ count: bigint | number }>>(
		Prisma.sql`
			SELECT COUNT(*) AS count
			FROM (${attentionQuery}) attention
		`,
	);
	return Number(rows[0]?.count ?? 0);
}

export async function repairReceivedInboundNeedsForSalesOrder(
	db: DbLike,
	input: {
		salesOrderId: number;
		actorUserId?: number | null;
	},
	dependencies: {
		listAttention?: typeof listReceivedInboundNeedsAttention;
		applyNeeds?: typeof applyInboundShipmentToNeeds;
	} = {},
) {
	const candidates = await (
		dependencies.listAttention ?? listReceivedInboundNeedsAttention
	)(db, {
		salesOrderId: input.salesOrderId,
	});
	const results: Awaited<ReturnType<typeof applyInboundShipmentToNeeds>>[] = [];
	for (const candidate of candidates) {
		results.push(
			await (dependencies.applyNeeds ?? applyInboundShipmentToNeeds)(db, {
				inboundId: candidate.inboundId,
				actorUserId: input.actorUserId ?? null,
				prioritizeSalesOrderId: input.salesOrderId,
			}),
		);
	}

	return {
		inboundIds: candidates.map((candidate) => candidate.inboundId),
		changedCount: results.filter((result) => result.changed).length,
		updatedDemandCount: results.reduce(
			(total, result) => total + result.updatedDemandCount,
			0,
		),
		recomputedComponentCount: results.reduce(
			(total, result) => total + result.recomputedComponentCount,
			0,
		),
		affectedSalesOrderIds: Array.from(
			new Set(results.flatMap((result) => result.affectedSalesOrderIds)),
		),
	};
}
