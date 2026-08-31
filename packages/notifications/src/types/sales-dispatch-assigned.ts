import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchAssignedInput,
	type SalesDispatchAssignedTags,
	salesDispatchAssignedSchema,
} from "../schemas";

export const salesDispatchAssigned: NotificationHandler = {
	schema: salesDispatchAssignedSchema,
	createActivity(
		data: SalesDispatchAssignedInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchAssignedTags = {
			type: "sales_dispatch_assigned",
			source: "user",
			priority: 2,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_assigned",
			source: "user",
			subject: "Dispatch assigned",
			headline: `Dispatch ${dispatchId} for order ${orderNo} has been assigned to you. Delivery mode: ${deliveryMode}.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, user, args) {
		return {
			...args,
			template: "sales-dispatch-assigned",
			to: [user.email],
			subject: `New Dispatch Assigned: Order ${data.orderNo}`,
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
			message: `Dispatch #${data.dispatchId} assigned for order ${data.orderNo || "-"}. Mode: ${data.deliveryMode || "delivery"}.`,
		};
	},
};
