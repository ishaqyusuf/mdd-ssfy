import type { NotificationHandler } from "../base";
import {
	type InventoryInboundInput,
	type InventoryInboundTags,
	inventoryInboundSchema,
} from "../schemas";

export const inventoryInbound: NotificationHandler = {
	schema: inventoryInboundSchema,
	createActivityWithoutContact: true,
	createActivity(data: InventoryInboundInput, author) {
		const payload: InventoryInboundTags = {
			type: "inventory_inbound",
			source: "user",
			priority: 5,
			salesId: data.salesId,
			salesNo: data.salesNo,
			...(data.attachment?.length ? { attachment: data.attachment } : {}),
		};

		return {
			type: "inventory_inbound",
			source: "user",
			subject: "Inventory Inbound",
			headline: data.headline || `Sale ${data.salesNo}`,
			note: data.note,
			color: data.color,
			authorId: author.id,
			tags: payload,
		};
	},
};
