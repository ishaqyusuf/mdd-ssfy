import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchDuplicateAlertInput,
	type SalesDispatchDuplicateAlertTags,
	salesDispatchDuplicateAlertSchema,
} from "../schemas";

export const salesDispatchDuplicateAlert: NotificationHandler = {
	schema: salesDispatchDuplicateAlertSchema,
	createActivity(
		data: SalesDispatchDuplicateAlertInput,
		author: UserData,
		_contact: UserData,
	) {
		const payload: SalesDispatchDuplicateAlertTags = {
			type: "sales_dispatch_duplicate_alert",
			source: "user",
			priority: 5,
			dispatchId: data.dispatchId,
		};

		return {
			type: "sales_dispatch_duplicate_alert",
			source: "user",
			subject: "Duplicate dispatch alert",
			headline: `Dispatch #${data.dispatchId} has duplicates and needs admin review.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
