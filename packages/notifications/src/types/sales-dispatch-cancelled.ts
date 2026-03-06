import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchCancelledInput,
	type SalesDispatchCancelledTags,
	salesDispatchCancelledSchema,
} from "../schemas";

export const salesDispatchCancelled: NotificationHandler = {
	schema: salesDispatchCancelledSchema,
	createActivity(
		data: SalesDispatchCancelledInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchCancelledTags = {
			type: "sales_dispatch_cancelled",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_cancelled",
			source: "user",
			subject: "Dispatch cancelled",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} has been cancelled.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} for order ${data.orderNo || "-"} has been cancelled.`,
		};
	},
};
