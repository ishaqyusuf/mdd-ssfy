export type PaymentSystemNotificationType =
	| "sales_checkout_success"
	| "sales_payment_recorded"
	| "sales_payment_refunded";

export interface PaymentSystemNotificationAuthor {
	id: number | null;
	role: "customer";
}

export interface PaymentSystemNotificationEvent<
	TPayload = Record<string, unknown>,
> {
	type: PaymentSystemNotificationType;
	recipientEmployeeId: number;
	recipientEmail?: string | null;
	author: PaymentSystemNotificationAuthor;
	payload: TPayload;
}

export interface SalesCheckoutSuccessNotificationPayload {
	orderNos: string[];
	customerName?: string;
	totalAmount: number;
}

export interface SalesPaymentRecordedNotificationPayload {
	orderNo: string;
	customerName?: string;
	amount: number;
	paymentMethod: string;
}

export interface SalesPaymentRefundedNotificationPayload {
	orderNo: string;
	customerName?: string;
	amount: number;
	reason?: string;
}

export interface PaymentNotificationSeed {
	customerId: number | null;
	customerName?: string;
	orderNo: string;
	salesRepEmail?: string | null;
	salesRepId: number;
}

export function buildSalesCheckoutSuccessNotificationEvent(input: {
	amount: number;
	customerId: number | null;
	customerName?: string;
	orderNos: string[];
	recipientEmployeeId: number;
	recipientEmail?: string | null;
}): PaymentSystemNotificationEvent<SalesCheckoutSuccessNotificationPayload> {
	return {
		type: "sales_checkout_success",
		recipientEmployeeId: input.recipientEmployeeId,
		recipientEmail: input.recipientEmail,
		author: {
			id: input.customerId,
			role: "customer",
		},
		payload: {
			orderNos: input.orderNos,
			customerName: input.customerName,
			totalAmount: input.amount,
		},
	};
}

export function buildSalesPaymentRecordedNotificationEvent(input: {
	amount: number;
	paymentMethod: string;
	seed: PaymentNotificationSeed;
}): PaymentSystemNotificationEvent<SalesPaymentRecordedNotificationPayload> {
	return {
		type: "sales_payment_recorded",
		recipientEmployeeId: input.seed.salesRepId,
		recipientEmail: input.seed.salesRepEmail,
		author: {
			id: input.seed.customerId,
			role: "customer",
		},
		payload: {
			amount: input.amount,
			customerName: input.seed.customerName,
			orderNo: input.seed.orderNo,
			paymentMethod: input.paymentMethod,
		},
	};
}

export function buildSalesPaymentRefundedNotificationEvent(input: {
	amount: number;
	reason?: string;
	seed: PaymentNotificationSeed;
}): PaymentSystemNotificationEvent<SalesPaymentRefundedNotificationPayload> {
	return {
		type: "sales_payment_refunded",
		recipientEmployeeId: input.seed.salesRepId,
		recipientEmail: input.seed.salesRepEmail,
		author: {
			id: input.seed.customerId,
			role: "customer",
		},
		payload: {
			amount: input.amount,
			customerName: input.seed.customerName,
			orderNo: input.seed.orderNo,
			reason: input.reason,
		},
	};
}
