import type { NotificationHandler, UserData } from "../base";
import {
	type SalesPackingListInput,
	type SalesPackingListTags,
	salesPackingListSchema,
} from "../schemas";

export const salesPackingList: NotificationHandler = {
	schema: salesPackingListSchema,
	createActivityWithoutContact: true,
	createActivity(
		data: SalesPackingListInput,
		author: UserData,
		_contact: UserData,
	) {
		const payload: SalesPackingListTags = {
			type: "sales-packing-list",
			source: "user",
			priority: 5,
			salesId: data.salesId,
			orderNo: data.orderNo,
			dispatchId: data.dispatchId,
			status: data.status,
		};

		return {
			type: "sales-packing-list",
			source: "user",
			subject: "Packing list updated",
			headline: `Order ${data.orderNo} is in the packing list workflow.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
