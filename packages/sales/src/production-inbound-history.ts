import type { Db, TransactionClient } from "@gnd/db";
import { z } from "zod";

const receiptIdentity = z.object({
	salesOrderId: z.number().int().positive(),
	inboundId: z.number().int().positive(),
});

/** Call only after authorizing order access. Workers do not receive admin history. */
export async function getProductionInboundHistory(
	db: Db | TransactionClient,
	input: { salesOrderId: number; inboundId?: number; cursor?: number },
	canViewAll: boolean,
	canEditInbound = false,
) {
	if (!canViewAll) return { receipts: [], nextReceiptCursor: null };
	const events = await db.event.findMany({
		where: {
			type: "production_inbound_received",
			deletedAt: null,
			...(input.cursor ? { id: { lt: input.cursor } } : {}),
			AND: [
				{ data: { path: "$.salesOrderId", equals: input.salesOrderId } },
				...(input.inboundId
					? [{ data: { path: "$.inboundId", equals: input.inboundId } }]
					: []),
			],
		},
		select: { id: true, data: true, createdAt: true },
		orderBy: { id: "desc" },
		take: 21,
	});
	const page = events.slice(0, 20);
	const cancellations = page.length
		? await db.event.findMany({
				where: {
					type: "production_inbound_cancelled",
					deletedAt: null,
					AND: [
						{ data: { path: "$.salesOrderId", equals: input.salesOrderId } },
						{
							OR: page.map((event) => ({
								data: { path: "$.receiptId", equals: event.id },
							})),
						},
					],
				},
				select: { data: true },
				take: 20,
			})
		: [];
	const cancelled = new Set(
		cancellations.map(
			(event) => (event.data as { receiptId?: number }).receiptId,
		),
	);
	return {
		receipts: page.flatMap((event) => {
			const parsed = receiptIdentity.safeParse(event.data);
			if (!parsed.success || parsed.data.salesOrderId !== input.salesOrderId)
				return [];
			const data = event.data as {
				version?: number;
				audit?: {
					before?: { order?: unknown };
					after?: { stockCommitments?: unknown };
				};
			};
			const reversible =
				data.version === 2 &&
				!!data.audit?.before?.order &&
				Array.isArray(data.audit?.after?.stockCommitments);
			return [
				{
					receiptId: event.id,
					inboundId: parsed.data.inboundId,
					receivedAt: event.createdAt,
					cancelled: cancelled.has(event.id),
					canCancel: canEditInbound && reversible && !cancelled.has(event.id),
					cancellationUnavailableReason: !reversible
						? "This receipt lacks reversal evidence. Open Inventory for review."
						: null,
				},
			];
		}),
		nextReceiptCursor: events.length > 20 ? (page.at(-1)?.id ?? null) : null,
	};
}
