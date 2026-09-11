import { Prisma, type Db, type TransactionClient } from "@gnd/db";

export async function findPendingFulfillmentNoticeCommands(
	db: Db | TransactionClient,
	input: { afterId?: string; limit?: number } = {},
) {
	const limit = Math.max(1, Math.min(Math.trunc(input.limit || 100), 200));
	const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
		SELECT h.id FROM SalesHistory h
		WHERE h.id > ${input.afterId ?? ""}
		AND JSON_UNQUOTE(JSON_EXTRACT(h.data, '$.event')) IN ('FULFILLMENT_ASSIGNED', 'FULFILLMENT_UPDATED', 'FULFILLMENT_SHORT_LOAD_CONFIRMED', 'FULFILLMENT_COMPLETED')
		AND EXISTS (
			SELECT 1 FROM JSON_TABLE(
				COALESCE(JSON_EXTRACT(h.data, '$.notificationIntents'), JSON_ARRAY()),
				'$[*]' COLUMNS(eventKey VARCHAR(191) PATH '$.eventKey')
			) intent
			WHERE intent.eventKey IS NOT NULL AND NOT EXISTS (
				SELECT 1 FROM SalesHistory receipt
				WHERE receipt.id = SHA2(CONCAT('fulfillment-notice:', intent.eventKey), 256)
			)
		)
		ORDER BY h.id ASC LIMIT ${limit + 1}
	`);
	const page = rows.slice(0, limit);
	return {
		requestIds: page.map((row) => row.id),
		nextCursor: rows.length > limit ? page.at(-1)!.id : null,
	};
}
