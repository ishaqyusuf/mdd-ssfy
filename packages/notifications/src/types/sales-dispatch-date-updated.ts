import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchDateUpdatedInput,
	type SalesDispatchDateUpdatedTags,
	salesDispatchDateUpdatedSchema,
} from "../schemas";

export const salesDispatchDateUpdated: NotificationHandler = {
	schema: salesDispatchDateUpdatedSchema,
	createActivity(
		data: SalesDispatchDateUpdatedInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchDateUpdatedTags = {
			type: "sales_dispatch_date_updated",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_date_updated",
			source: "user",
			subject: "Dispatch due date updated",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} has an updated due date.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} for order ${data.orderNo || "-"} has a new due date.`,
		};
	},
};
