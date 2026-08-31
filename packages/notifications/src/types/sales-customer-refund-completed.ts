import type { NotificationHandler } from "../base";
import {
	type SalesCustomerRefundCompletedInput,
	type SalesCustomerRefundCompletedTags,
	salesCustomerRefundCompletedSchema,
} from "../schemas";

export const salesCustomerRefundCompleted: NotificationHandler = {
	schema: salesCustomerRefundCompletedSchema,
	createActivityWithoutContact: true,
	createDirectEmailContact(data: SalesCustomerRefundCompletedInput) {
		return {
			id: 0,
			profileId: 0,
			name: data.customerName,
			email: data.customerEmail,
			role: "customer",
			emailNotification: true,
			inAppNotification: false,
			whatsAppNotification: false,
		};
	},
	createActivity(data: SalesCustomerRefundCompletedInput, author) {
		const tags: SalesCustomerRefundCompletedTags = {
			type: "sales_customer_refund_completed",
			source: "system",
			priority: 5,
			customerEmail: data.customerEmail,
			customerName: data.customerName,
			orderNos: data.sales.map((sale) => sale.orderNo),
			refundId: data.refundId,
			totalAmount: data.totalAmount,
		};
		return {
			type: "sales_customer_refund_completed",
			source: "system",
			subject: "Customer refund confirmation sent",
			headline: `Refund confirmation sent to ${data.customerName}.`,
			note: `$${data.totalAmount.toFixed(2)} completed by Square.`,
			authorId: author.id,
			tags,
		};
	},
	createEmail(data, author, _user, args) {
		return {
			...args,
			template: "sales-customer-refund-completed",
			to: [data.customerEmail],
			subject: `Refund completed for order${data.sales.length > 1 ? "s" : ""} ${data.sales.map((sale) => sale.orderNo).join(", ")}`,
			data: {
				...data,
				salesRepName: author.name,
			},
		};
	},
};
