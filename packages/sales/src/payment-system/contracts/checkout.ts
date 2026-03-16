export interface SalesCheckoutTokenPayload {
	amount?: number | null;
	paymentId?: string | null;
	salesIds?: number[] | null;
	walletId?: number | null;
}

export interface SalesCheckoutOrderSummary {
	id: number;
	orderId: string;
	amountDue: number;
	customerId: number | null;
	salesRepId: number;
	accountNo?: string | null;
	customerPhone?: string | null;
	email?: string | null;
	displayName?: string | null;
	address?: string | null;
}

export interface SalesCheckoutNotificationSeed {
	email: string;
	amount: number;
	customerId: number | null;
	customerName?: string;
	ordersNo: string[];
	salesRepId: number;
}
