import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchUpdatedInput,
	type SalesDispatchUpdatedTags,
	salesDispatchUpdatedSchema,
} from "../schemas";

export const salesDispatchUpdated: NotificationHandler = {
	schema: salesDispatchUpdatedSchema,
	createActivity(
		data: SalesDispatchUpdatedInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchUpdatedTags = {
			type: "sales_dispatch_updated",
			source: "user",
			priority: 2,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_updated",
			source: "user",
			subject: "Fulfillment updated",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} has been updated. Review the assigned items and delivery details.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} for order ${data.orderNo || "-"} has been updated. Review the assigned items and delivery details.`,
		};
	},
};
