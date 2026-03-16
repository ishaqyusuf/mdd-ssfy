import type { NotificationHandler } from "../base";
import {
	type SalesPaymentRefundedInput,
	type SalesPaymentRefundedTags,
	salesPaymentRefundedSchema,
} from "../schemas";

export const salesPaymentRefunded: NotificationHandler = {
	schema: salesPaymentRefundedSchema,
	createActivity(data: SalesPaymentRefundedInput, author) {
		const payload: SalesPaymentRefundedTags = {
			type: "sales_payment_refunded",
			source: "system",
			priority: 5,
			amount: data.amount,
			customerName: data.customerName,
			orderNo: data.orderNo,
			reason: data.reason,
		};

		return {
			type: "sales_payment_refunded",
			source: "system",
			subject: "Payment refunded",
			headline: data.customerName
				? `${data.customerName} refund recorded for order ${data.orderNo}.`
				: `Refund recorded for order ${data.orderNo}.`,
			note:
				typeof data.reason === "string" && data.reason.length > 0
					? `$${data.amount.toFixed(2)} refunded. ${data.reason}`
					: `$${data.amount.toFixed(2)} refunded.`,
			authorId: author.id,
			tags: payload,
		};
	},
};
