import type { NotificationHandler } from "../base";
import {
	type SalesCustomerPaymentFailedInput,
	type SalesCustomerPaymentFailedTags,
	salesCustomerPaymentFailedSchema,
} from "../schemas";

export const salesCustomerPaymentFailed: NotificationHandler = {
	schema: salesCustomerPaymentFailedSchema,
	createActivityWithoutContact: true,
	createActivity(data: SalesCustomerPaymentFailedInput, author) {
		const payload: SalesCustomerPaymentFailedTags = {
			type: "sales_customer_payment_failed",
			source: "system",
			priority: 5,
			customerEmail: data.customerEmail,
			customerName: data.customerName,
			orderNos: data.sales.map((sale) => sale.orderNo),
			totalAmount: data.totalAmount ?? null,
			paymentMethod: data.paymentMethod ?? null,
		};

		return {
			type: "sales_customer_payment_failed",
			source: "system",
			subject: "Customer payment failed notice sent",
			headline: `Failure notice sent to ${data.customerName} for ${data.sales.length} order${data.sales.length > 1 ? "s" : ""}.`,
			note: data.reason || undefined,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, _user, args) {
		return {
			...args,
			template: "sales-customer-payment-failed",
			to: [data.customerEmail],
			subject: `Payment attempt incomplete for order${data.sales.length > 1 ? "s" : ""} ${data.sales.map((sale) => sale.orderNo).join(", ")}`,
			data,
		};
	},
};
