import { type Db, Prisma, type TransactionClient } from "@gnd/db";

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

const receivedInboundNeedsAttentionQuery = Prisma.sql`
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
	INNER JOIN (
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
		GROUP BY demand.inboundShipmentItemId
	) demandTotals ON demandTotals.inboundShipmentItemId = item.id
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

export async function listReceivedInboundNeedsAttention(
	db: DbLike,
	input: { take?: number } = {},
): Promise<ReceivedInboundNeedsAttentionItem[]> {
	type RawAttentionRow = Omit<
		ReceivedInboundNeedsAttentionItem,
		"linkedNeedCount" | "appliedQty" | "capacityQty"
	> & {
		linkedNeedCount: bigint | number;
		appliedQty: bigint | number;
		capacityQty: bigint | number;
	};
	const orderedAttentionQuery = Prisma.sql`
		${receivedInboundNeedsAttentionQuery}
		ORDER BY COALESCE(receivedAt, createdAt) DESC, inboundId DESC
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
	const rows = await db.$queryRaw<Array<{ count: bigint | number }>>(
		Prisma.sql`
			SELECT COUNT(*) AS count
			FROM (${receivedInboundNeedsAttentionQuery}) attention
		`,
	);
	return Number(rows[0]?.count ?? 0);
}
