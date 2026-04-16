import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchCompletedInput,
	type SalesDispatchCompletedTags,
	salesDispatchCompletedSchema,
} from "../schemas";

export const salesDispatchCompleted: NotificationHandler = {
	schema: salesDispatchCompletedSchema,
	createActivity(
		data: SalesDispatchCompletedInput,
		author: UserData,
		_contact: UserData,
	) {
		const {
			salesId,
			orderNo,
			dispatchId,
			deliveryMode,
			dueDate,
			driverId,
			packedBy,
			receivedBy,
			signature,
			attachment,
			attachments,
		} = data;
		const resolvedAttachments = attachment?.length ? attachment : attachments;
		const payload: SalesDispatchCompletedTags = {
			type: "sales_dispatch_completed",
			source: "user",
			priority: 5,
			salesId,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
			packedBy,
			receivedBy,
			signature,
			...(resolvedAttachments?.length
				? {
						attachment: resolvedAttachments,
						attachments: resolvedAttachments,
					}
				: {}),
		};

		return {
			type: "sales_dispatch_completed",
			source: "user",
			subject: "Dispatch completed",
			headline: `Dispatch ${dispatchId} for order ${orderNo || "-"} has been completed.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `Dispatch #${data.dispatchId} for order ${data.orderNo || "-"} has been completed.`,
		};
	},
};
