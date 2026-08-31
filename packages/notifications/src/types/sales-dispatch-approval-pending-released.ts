import type { NotificationHandler, UserData } from "../base";
import {
	type SalesDispatchApprovalPendingReleasedInput,
	type SalesDispatchApprovalPendingReleasedTags,
	salesDispatchApprovalPendingReleasedSchema,
} from "../schemas";

export const salesDispatchApprovalPendingReleased: NotificationHandler = {
	schema: salesDispatchApprovalPendingReleasedSchema,
	createActivity(
		data: SalesDispatchApprovalPendingReleasedInput,
		author: UserData,
		_contact: UserData,
	) {
		const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
		const payload: SalesDispatchApprovalPendingReleasedTags = {
			type: "sales_dispatch_approval_pending_released",
			source: "user",
			priority: 2,
			dispatchId,
			orderNo,
			deliveryMode,
			dueDate,
			driverId,
		};

		return {
			type: "sales_dispatch_approval_pending_released",
			source: "user",
			subject: "Dispatch can continue",
			headline: `Packing approval no longer blocks dispatch ${dispatchId} for order ${orderNo || "-"}. Open the dispatch to continue.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
