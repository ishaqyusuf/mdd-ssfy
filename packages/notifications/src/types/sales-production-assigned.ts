import type { NotificationHandler } from "../base";
import {
	type SalesProductionAssignedInput,
	type SalesProductionAssignedTags,
	salesProductionAssignedSchema,
} from "../schemas";

export const salesProductionAssigned: NotificationHandler = {
	schema: salesProductionAssignedSchema,
	createActivity(data: SalesProductionAssignedInput, author) {
		const payload: SalesProductionAssignedTags = {
			type: "sales_production_assigned",
			source: "user",
			priority: 5,
			salesId: data.salesId,
			orderNo: data.orderNo,
			assignedToId: data.assignedToId,
			assignedQty: data.assignedQty,
			itemCount: data.itemCount,
			dueDate: data.dueDate,
		};

		return {
			type: "sales_production_assigned",
			source: "user",
			subject: "Production assigned",
			headline: `Order ${data.orderNo || "-"} has been assigned to you for production.`,
			note: [
				data.assignedQty ? `Qty: ${data.assignedQty}` : null,
				data.itemCount ? `Items: ${data.itemCount}` : null,
				data.dueDate ? `Due: ${data.dueDate.toDateString()}` : null,
			]
				.filter(Boolean)
				.join(" | "),
			authorId: author.id,
			tags: payload,
		};
	},
};
