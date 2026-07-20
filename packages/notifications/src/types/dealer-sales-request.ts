import { getAppUrl } from "@gnd/utils/envs";
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
	createEmail(data, _author, user, args) {
		const requestUrl = `${getAppUrl().replace(/\/$/, "")}/sales-rep?tab=requests&requestId=${data.requestId}`;

		return {
			...args,
			template: "dealer-sales-request",
			to: user.email ? [user.email] : undefined,
			from: "GND Millwork <noreply@gndprodesk.com>",
			subject: `Dealer order request for quote ${data.quoteNo}`,
			data: {
				recipientName: user.name,
				dealerName: data.dealerName,
				quoteNo: data.quoteNo,
				customerName: data.customerName,
				requestedAt: data.requestedAt,
				requestUrl,
			},
		};
	},
};
