import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchInProgressInput,
	type SalesDispatchInProgressTags,
	salesDispatchInProgressSchema,
} from "../schemas";

export const salesDispatchInProgress: NotificationHandler = {
	schema: salesDispatchInProgressSchema,
	createActivity(
		data: SalesDispatchInProgressInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchInProgressTags = {
			type: "sales_dispatch_in_progress",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_in_progress",
			source: "user",
			subject: "Dispatch in progress",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} is now in progress.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} for order ${data.orderNo || "-"} is now in progress.`,
		};
	},
};
