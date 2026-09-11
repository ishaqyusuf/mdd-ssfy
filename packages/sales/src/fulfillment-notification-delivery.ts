import { createHash } from "node:crypto";
import { Prisma, type Db, type TransactionClient } from "@gnd/db";
import { z } from "zod";

const intentSchema = z.object({
	version: z.literal(1),
	eventKey: z.string().min(1),
	channel: z.enum([
		"sales_dispatch_assigned",
		"sales_dispatch_unassigned",
		"sales_dispatch_updated",
		"sales_dispatch_completed",
	]),
	recipientId: z.number().int().positive(),
	actorId: z.number().int().positive(),
	salesId: z.number().int().positive(),
	fulfillmentId: z.number().int().positive(),
	dueDate: z.string().nullable(),
	deliveryMode: z.enum(["delivery", "pickup"]).optional(),
	completedByAdmin: z.boolean().optional(),
});

export type FulfillmentNotificationIntent = z.infer<typeof intentSchema>;

/** Delivery must create an in-app activity using this transaction, without external side effects. */
export async function deliverFulfillmentNotificationIntents(
	db: Db,
	requestId: string,
	deliver: (
		tx: TransactionClient,
		intent: FulfillmentNotificationIntent,
	) => Promise<number>,
) {
	return db.$transaction(async (tx) => {
		await tx.$queryRaw(
			Prisma.sql`SELECT id FROM SalesHistory WHERE id=${requestId} FOR UPDATE`,
		);
		const event = await tx.salesHistory.findUniqueOrThrow({
			where: { id: requestId },
		});
		const data = z
			.object({
				dispatchId: z.number().int().positive(),
				notificationIntents: z.array(intentSchema).default([]),
			})
			.parse(event.data);
		const activityIds: number[] = [];
		for (const intent of data.notificationIntents) {
			if (
				intent.salesId !== event.salesId ||
				intent.fulfillmentId !== data.dispatchId ||
				intent.eventKey !==
					`${requestId}:${intent.channel}:${intent.recipientId}`
			) {
				throw new Error(
					"Fulfillment notification intent does not match its command.",
				);
			}
			const receiptId = createHash("sha256")
				.update(`fulfillment-notice:${intent.eventKey}`)
				.digest("hex");
			const receipt = await tx.salesHistory.findUnique({
				where: { id: receiptId },
				select: { data: true },
			});
			if (receipt) {
				const delivered = z
					.object({
						event: z.literal("FULFILLMENT_NOTICE_DELIVERED"),
						eventKey: z.literal(intent.eventKey),
						activityId: z.number().int().positive(),
					})
					.parse(receipt.data);
				activityIds.push(delivered.activityId);
				continue;
			}
			const activityId = z
				.number()
				.int()
				.positive()
				.parse(await deliver(tx, intent));
			await tx.salesHistory.create({
				data: {
					id: receiptId,
					salesId: event.salesId,
					authorName: event.authorName,
					name: "Fulfillment notification delivered",
					data: {
						event: "FULFILLMENT_NOTICE_DELIVERED",
						eventKey: intent.eventKey,
						dispatchId: intent.fulfillmentId,
						recipientId: intent.recipientId,
						activityId,
					},
				},
			});
			activityIds.push(activityId);
		}
		return { activityIds };
	});
}
