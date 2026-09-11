import type { Db, TransactionClient } from "@gnd/db";
import {
	deliverFulfillmentNotificationIntents,
	type FulfillmentNotificationIntent,
} from "@gnd/sales/fulfillment-notification-delivery";
import { createActivity } from "./activities";
import { getSubscriberAccount } from "./channel-subscribers";
import { createActivitySchema } from "./schemas";
import { salesDispatchAssigned } from "./types/sales-dispatch-assigned";
import { salesDispatchUnassigned } from "./types/sales-dispatch-unassigned";
import { salesDispatchUpdated } from "./types/sales-dispatch-updated";
import { salesDispatchCompleted } from "./types/sales-dispatch-completed";

const handlers = {
	sales_dispatch_assigned: salesDispatchAssigned,
	sales_dispatch_unassigned: salesDispatchUnassigned,
	sales_dispatch_updated: salesDispatchUpdated,
	sales_dispatch_completed: salesDispatchCompleted,
};

export async function createFulfillmentNoticeActivity(
	tx: TransactionClient,
	intent: FulfillmentNotificationIntent,
) {
	const dispatch = await tx.orderDelivery.findFirstOrThrow({
		where: { id: intent.fulfillmentId, salesOrderId: intent.salesId },
		select: { deliveryMode: true, order: { select: { orderId: true } } },
	});
	const author = await getSubscriberAccount(tx, intent.actorId, "employee");
	const recipient = await getSubscriberAccount(
		tx,
		intent.recipientId,
		"employee",
	);
	if (!author || !recipient)
		throw new Error("Fulfillment notification contact is unavailable.");
	const handler = handlers[intent.channel];
	const payload = handler.schema.parse({
		orderNo: dispatch.order.orderId,
		dispatchId: intent.fulfillmentId,
		deliveryMode:
			intent.deliveryMode ??
			(dispatch.deliveryMode === "pickup" ? "pickup" : "delivery"),
		dueDate: intent.dueDate
			? new Date(`${intent.dueDate}T00:00:00.000Z`)
			: undefined,
		driverId: intent.recipientId,
		completedByAdmin: intent.completedByAdmin,
	});
	const activity = createActivitySchema.parse(
		handler.createActivity(
			payload,
			{ ...author, role: "employee", email: author.email || "" },
			{ ...recipient, role: "employee", email: recipient.email || "" },
		),
	);
	const saved = await createActivity(
		tx,
		{
			...activity,
			tags: { ...activity.tags, fulfillmentEventKey: intent.eventKey },
		},
		author.id,
		[recipient.id],
	);
	return saved.id;
}

/** In-app delivery only: no email, WhatsApp or other external I/O occurs in this transaction. */
export async function deliverFulfillmentNotices(db: Db, requestId: string) {
	return deliverFulfillmentNotificationIntents(
		db,
		requestId,
		createFulfillmentNoticeActivity,
	);
}
