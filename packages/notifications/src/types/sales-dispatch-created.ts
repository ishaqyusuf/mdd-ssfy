import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchAssignedInput,
	type SalesDispatchCreatedTags,
	salesDispatchAssignedSchema,
} from "../schemas";

export const salesDispatchCreated: NotificationHandler = {
	schema: salesDispatchAssignedSchema,
	createActivity(
		data: SalesDispatchAssignedInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchCreatedTags = {
			type: "sales_dispatch_created",
			source: "user",
			priority: 5,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_created",
			source: "user",
			subject: "Dispatch created",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} has been created.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, user, args) {
		return {
			...args,
			template: "sales-dispatch-created",
			to: [user.email],
			subject: `New Dispatch Created: Order ${data.orderNo}`,
			data: {
				orderNo: data.orderNo,
				dispatchId: data.dispatchId,
				deliveryMode: data.deliveryMode,
				dueDate: data.dueDate,
				recipientName: user.name,
			},
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} for order ${data.orderNo || "-"} has been created.`,
		};
	},
};
