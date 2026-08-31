import type { NotificationHandler } from "../base";
import {
	type SalesProductionSubmittedInput,
	type SalesProductionSubmittedTags,
	salesProductionSubmittedSchema,
} from "../schemas";

export const salesProductionSubmitted: NotificationHandler = {
	schema: salesProductionSubmittedSchema,
	createActivity(data: SalesProductionSubmittedInput, author) {
		const payload: SalesProductionSubmittedTags = {
			type: "sales_production_submitted",
			source: "user",
			priority: 5,
			...data,
		};
		return {
			type: "sales_production_submitted",
			source: "user",
			subject: "Production submitted",
			headline: `${data.submittedByName || "A production worker"} submitted production work for order ${data.orderNo || "-"}.`,
			note: `Qty: ${data.submittedQty}`,
			authorId: author.id,
			tags: payload,
		};
	},
};
