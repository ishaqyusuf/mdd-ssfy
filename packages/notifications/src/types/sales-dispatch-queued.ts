import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchQueuedInput,
	type SalesDispatchQueuedTags,
	salesDispatchQueuedSchema,
} from "../schemas";

export const salesDispatchQueued: NotificationHandler = {
	schema: salesDispatchQueuedSchema,
	createActivity(
		data: SalesDispatchQueuedInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchQueuedTags = {
			type: "sales_dispatch_queued",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_queued",
			source: "user",
			subject: "Dispatch queued",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} is queued.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} for order ${data.orderNo || "-"} is queued.`,
		};
	},
};
