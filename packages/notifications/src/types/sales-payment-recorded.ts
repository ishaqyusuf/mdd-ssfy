import type { NotificationHandler } from "../base";
import {
	type SalesPaymentRecordedInput,
	type SalesPaymentRecordedTags,
	salesPaymentRecordedSchema,
} from "../schemas";

export const salesPaymentRecorded: NotificationHandler = {
	schema: salesPaymentRecordedSchema,
	createActivity(data: SalesPaymentRecordedInput, author) {
		const payload: SalesPaymentRecordedTags = {
			type: "sales_payment_recorded",
			source: "system",
			priority: 5,
			amount: data.amount,
			customerName: data.customerName,
			orderNo: data.orderNo,
			paymentMethod: data.paymentMethod,
		};

		return {
			type: "sales_payment_recorded",
			source: "system",
			subject: "Payment recorded",
			headline: data.customerName
				? `${data.customerName} payment recorded for order ${data.orderNo}.`
				: `Payment recorded for order ${data.orderNo}.`,
			note: `$${data.amount.toFixed(2)} via ${data.paymentMethod}`,
			authorId: author.id,
			tags: payload,
		};
	},
};
