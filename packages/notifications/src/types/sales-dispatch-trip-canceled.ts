import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchTripCanceledInput,
	type SalesDispatchTripCanceledTags,
	salesDispatchTripCanceledSchema,
} from "../schemas";

export const salesDispatchTripCanceled: NotificationHandler = {
	schema: salesDispatchTripCanceledSchema,
	createActivity(
		data: SalesDispatchTripCanceledInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchTripCanceledTags = {
			type: "sales_dispatch_trip_canceled",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_trip_canceled",
			source: "user",
			subject: "Dispatch trip canceled",
			headline: `Trip canceled for dispatch ${dispatchId} on order ${orderNo || "-"}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Trip canceled for dispatch #${data.dispatchId} on order ${data.orderNo || "-"}.`,
		};
	},
};
