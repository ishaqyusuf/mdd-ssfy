import type { NotificationHandler } from "../base";
import {
	type DealerSalesRequestInput,
	type DealerSalesRequestTags,
	dealerSalesRequestSchema,
} from "../schemas";

export const dealerSalesRequest: NotificationHandler = {
	schema: dealerSalesRequestSchema,
	createActivity(data: DealerSalesRequestInput, author) {
		const payload: DealerSalesRequestTags = {
			type: "dealer_sales_request",
			source: "system",
			priority: 4,
			requestId: data.requestId,
			salesId: data.salesId,
			quoteNo: data.quoteNo,
			dealerName: data.dealerName,
			customerName: data.customerName,
			requestedAt: data.requestedAt,
		};

		return {
			type: "dealer_sales_request",
			source: "system",
			subject: "Dealer order request",
			headline: `${data.dealerName} requested order approval for quote ${data.quoteNo}.`,
			note: data.customerName
				? `Customer: ${data.customerName}.`
				: "Review the dealer quote and approve or reject the request.",
			authorId: author.id,
			tags: payload,
		};
	},
};
