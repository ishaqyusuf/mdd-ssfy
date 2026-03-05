import type { NotificationHandler, UserData } from "../base";
import {
	type DispatchPackingDelayInput,
	type DispatchPackingDelayTags,
	dispatchPackingDelaySchema,
} from "../schemas";

export const dispatchPackingDelay: NotificationHandler = {
	schema: dispatchPackingDelaySchema,
	createActivity(
		data: DispatchPackingDelayInput,
		author: UserData,
		_contact: UserData,
	) {
		const payload: DispatchPackingDelayTags = {
			type: "dispatch_packing_delay",
			source: "user",
			priority: 5,
			orderNo: data.orderNo,
			dispatchId: data.dispatchId,
			salesItemId: data.salesItemId,
			itemUid: data.itemUid,
			itemName: data.itemName,
			pendingQty: data.pendingQty,
			note: data.note,
		};

		const qty =
			data.pendingQty.qty ??
			(data.pendingQty.lh || 0) + (data.pendingQty.rh || 0);

		return {
			type: "dispatch_packing_delay",
			source: "user",
			subject: "Pending production item marked ready",
			headline: `${data.itemName} (${qty}) is reported ready but not available for packing yet.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
