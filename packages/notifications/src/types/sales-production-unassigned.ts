import type { NotificationHandler } from "../base";
import {
	type SalesProductionUnassignedInput,
	type SalesProductionUnassignedTags,
	salesProductionUnassignedSchema,
} from "../schemas";

export const salesProductionUnassigned: NotificationHandler = {
	schema: salesProductionUnassignedSchema,
	createActivity(data: SalesProductionUnassignedInput, author) {
		const payload: SalesProductionUnassignedTags = {
			type: "sales_production_unassigned",
			source: "user",
			priority: 5,
			...data,
		};
		return {
			type: "sales_production_unassigned",
			source: "user",
			subject: "Production assignment removed",
			headline: `Order ${data.orderNo || "-"} has been unassigned from you.`,
			note: data.assignedQty ? `Qty: ${data.assignedQty}` : undefined,
			authorId: author.id,
			tags: payload,
		};
	},
};
