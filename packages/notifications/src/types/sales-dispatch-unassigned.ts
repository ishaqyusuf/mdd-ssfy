import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchUnassignedInput,
	type SalesDispatchUnassignedTags,
	salesDispatchUnassignedSchema,
} from "../schemas";

export const salesDispatchUnassigned: NotificationHandler = {
	schema: salesDispatchUnassignedSchema,
	createActivity(
		data: SalesDispatchUnassignedInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchUnassignedTags = {
			type: "sales_dispatch_unassigned",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_unassigned",
			source: "user",
			subject: "Dispatch unassigned",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} has been unassigned.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} for order ${data.orderNo || "-"} has been unassigned.`,
		};
	},
};
