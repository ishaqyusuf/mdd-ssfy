import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchPackingResetInput,
	type SalesDispatchPackingResetTags,
	salesDispatchPackingResetSchema,
} from "../schemas";

export const salesDispatchPackingReset: NotificationHandler = {
	schema: salesDispatchPackingResetSchema,
	createActivity(
		data: SalesDispatchPackingResetInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchPackingResetTags = {
			type: "sales_dispatch_packing_reset",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_packing_reset",
			source: "user",
			subject: "Dispatch packing reset",
			headline: `Dispatch ${dispatchId} packing was reset and moved back to queue.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} packing reset for order ${data.orderNo || "-"}.`,
		};
	},
};
