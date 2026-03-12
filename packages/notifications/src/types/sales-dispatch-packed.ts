import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchPackedInput,
	type SalesDispatchPackedTags,
	salesDispatchPackedSchema,
} from "../schemas";

export const salesDispatchPacked: NotificationHandler = {
	schema: salesDispatchPackedSchema,
	createActivity(
		data: SalesDispatchPackedInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchPackedTags = {
			type: "sales_dispatch_packed",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_packed",
			source: "user",
			subject: "Dispatch packed",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} has updated packing.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} packing updated for order ${data.orderNo || "-"}.`,
		};
	},
};
