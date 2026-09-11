import type { Db } from "@gnd/db";
import { deliverFulfillmentNotices } from "@gnd/notifications/fulfillment-delivery";

export async function deliverOrQueueFulfillmentNotices(
	db: Db,
	requestId: string,
	queue: (requestId: string) => Promise<unknown>,
	deliver = deliverFulfillmentNotices,
) {
	try {
		await deliver(db, requestId);
		return { delivered: true, queued: false };
	} catch {
		try {
			await queue(requestId);
			return { delivered: false, queued: true };
		} catch {
			return { delivered: false, queued: false };
		}
	}
}
