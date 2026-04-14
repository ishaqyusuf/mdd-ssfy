import type { NotificationHandler, UserData } from "../base";
import {
	type SalesProductionAllCompletedInput,
	type SalesProductionAllCompletedTags,
	salesProductionAllCompletedSchema,
} from "../schemas";

export const salesProductionAllCompleted: NotificationHandler = {
	schema: salesProductionAllCompletedSchema,
	createActivity(
		data: SalesProductionAllCompletedInput,
		author: UserData,
		_contact: UserData,
	) {
		const payload: SalesProductionAllCompletedTags = {
			type: "sales_production_all_completed",
			source: "user",
			priority: 5,
			salesId: data.salesId,
			orderNo: data.orderNo,
		};

		return {
			type: "sales_production_all_completed",
			source: "user",
			subject: "Production completed",
			headline: `All production items for order ${data.orderNo || data.salesId} have been completed.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createWhatsApp(data) {
		return {
			message: `All production items for order ${data.orderNo || data.salesId} have been completed.`,
		};
	},
};
