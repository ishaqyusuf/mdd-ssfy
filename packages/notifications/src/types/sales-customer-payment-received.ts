import type { NotificationHandler } from "../base";
import {
	type SalesCustomerPaymentReceivedInput,
	type SalesCustomerPaymentReceivedTags,
	salesCustomerPaymentReceivedSchema,
} from "../schemas";

export const salesCustomerPaymentReceived: NotificationHandler = {
	schema: salesCustomerPaymentReceivedSchema,
	createActivityWithoutContact: true,
	createActivity(data: SalesCustomerPaymentReceivedInput, author) {
		const payload: SalesCustomerPaymentReceivedTags = {
			type: "sales_customer_payment_received",
			source: "system",
			priority: 5,
			customerEmail: data.customerEmail,
			customerName: data.customerName,
			orderNos: data.sales.map((sale) => sale.orderNo),
			totalAmount: data.totalAmount,
			paymentMethod: data.paymentMethod,
		};

		return {
			type: "sales_customer_payment_received",
			source: "system",
			subject: "Customer payment receipt sent",
			headline: `Receipt sent to ${data.customerName} for ${data.sales.length} order${data.sales.length > 1 ? "s" : ""}.`,
			note: `$${data.totalAmount.toFixed(2)} via ${data.paymentMethod}`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, _author, _user, args) {
		return {
			...args,
			template: "sales-customer-payment-received",
			to: [data.customerEmail],
			subject: `Payment received for order${data.sales.length > 1 ? "s" : ""} ${data.sales.map((sale) => sale.orderNo).join(", ")}`,
			data,
		};
	},
};
