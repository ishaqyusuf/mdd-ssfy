import type { NotificationHandler } from "../base";
import {
	type QuoteAcceptedInput,
	type QuoteAcceptedTags,
	quoteAcceptedSchema,
} from "../schemas";

export const quoteAccepted: NotificationHandler = {
	schema: quoteAcceptedSchema,
	createActivity(data: QuoteAcceptedInput, author) {
		const payload: QuoteAcceptedTags = {
			type: "quote_accepted",
			source: "system",
			priority: 5,
			salesId: data.salesId,
			orderNo: data.orderNo,
			quoteNo: data.quoteNo,
			customerName: data.customerName,
			acceptedAt: data.acceptedAt,
		};

		return {
			type: "quote_accepted",
			source: "system",
			subject: "Quote accepted",
			headline: data.customerName
				? `${data.customerName} accepted quote ${data.quoteNo}.`
				: `Quote ${data.quoteNo} was accepted.`,
			note: `Converted to order ${data.orderNo}.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
